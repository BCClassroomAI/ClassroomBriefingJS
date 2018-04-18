'use strict';
const Alexa = require("alexa-sdk");
const AWS = require('aws-sdk');

AWS.config.update({region: 'us-east-1'});
const ddb = new AWS.DynamoDB();

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context);

    alexa.appId = 'amzn1.ask.skill.e4b917d2-ebd3-40d3-9019-71f569430f8d';
    alexa.dynamoDBTableName = 'ClassroomBriefingAttributes';
    alexa.registerHandlers(handlers);
    alexa.execute();
};

const handlers = {
    'LaunchRequest': function () {
        console.log('LaunchRequest');

        const speechOutput = 'This is the Classroom Briefing skill.';
        const errorOutput = 'Whoops! Something went wrong. Sorry!';

        this.context.succeed({
            "response": {
                "outputSpeech": {
                    "type": "PlainText",
                    "text": speechOutput
                },
                "shouldEndSession": true
            },
            "sessionAttributes": {}
        });
    },
    'PlayBriefing': function () {
        if (this.event.request.dialogState == "STARTED" || this.event.request.dialogState == "IN_PROGRESS"){
            this.context.succeed({
                "response": {
                    "directives": [
                        {
                            "type": "Dialog.Delegate"
                        }
                    ],
                    "shouldEndSession": false
                },
                "sessionAttributes": {}
            });
        } else {
            var courseNumber = this.event.request.intent.slots.courseNumber.value;
            var classDate = this.event.request.intent.slots.classDate.value;
            console.log('course: ' + courseNumber + ', date: ' + classDate);

            var ddbparams = {
                TableName: 'ClassroomBriefings',
                Key: {
                    "CourseNumber": {S: courseNumber},
                    "ClassDate": {S: classDate}
                },
                ProjectionExpression: 'BriefingNotes'
            };
            ddb.getItem(ddbparams).promise().then(
                (data) => {
                    console.log('getItem OK');
                    var briefingText = '';
                    if (!data.hasOwnProperty('Item')) {
                        briefingText = "Hmm, I don't have anything for that course and date.";
                    }
                    else {
                        data.Item.BriefingNotes.L.forEach((elt, idx, array) => {
                            console.log('Retrieved: ' + elt.S);
                            briefingText += '<s>' + elt.S + '</s>';
                        });
                    }

                    this.response.speak(briefingText);
                    this.emit(':responseReady');
                },
                (error) => {
                    console.log('getItem error: ' + error);
                }
            )
        }
    },
    'AddBriefingNote': function () {
        console.log('AddBriefingNote heard: ' + this.event.request.intent.slots.noteContent.value);
        this.attributes.noteContent = this.event.request.intent.slots.noteContent.value;
        this.emit(':ask', "Which course?", "Which course?");
    },
    'SpecifyCourse': function() {
        var courseNumber = this.event.request.intent.slots.courseNumber.value;
        this.attributes.courseNumber = this.event.request.intent.slots.courseNumber.value;
        console.log('SpecifyCourse got course=' + courseNumber);
        this.emit(':ask', "What date?", "What date?");
    },
    'SpecifyDate': function() {
        var classDate = this.event.request.intent.slots.classDate.value;
        this.attributes.classDate = this.event.request.intent.slots.classDate.value;
        console.log('SpecifyDate got date=' + classDate);
        console.log('SpecifyDate sees attributes: ' + JSON.stringify(this.attributes));
        this.response.speak("OK, I have what I need. I'll add your note.");

        var courseNumber = this.attributes.courseNumber;
        var noteContent = this.attributes.noteContent;
        var timestamp = ((new Date().getMinutes())%10).toString();
        console.log('SpecifyDate using timestamp=' + timestamp);

        var ddbparams = {
            TableName: 'ClassroomBriefings',
            ExpressionAttributeNames: {
                '#BN': 'BriefingNotes'
            },
            ExpressionAttributeValues: {
                ':note': {'L' : [{'S': noteContent}]},
                ':empty_list': {'L': []}
            },
            Key: {
                'CourseNumber': {S: courseNumber},
                'ClassDate': {S: classDate}
            },
            UpdateExpression: 'SET #BN = list_append(if_not_exists(#BN, :empty_list), :note)'
        };

        ddb.updateItem(ddbparams).promise().then(
            () => {
                console.log('updateItem OK');
                this.emit(':responseReady');
            },
            (error) => {
                console.log('updateItem error: ' + error);
                this.emit(':responseReady');
            }
        );
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = 'This is the Classroom Briefing skill.';

        this.response.speak(speechOutput);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak('Goodbye!');
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak('See you later!');
        this.emit(':responseReady');
    }
};



