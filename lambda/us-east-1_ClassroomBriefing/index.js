'use strict';
const Alexa = require("alexa-sdk");
const AWS = require('aws-sdk');

AWS.config.update({region: 'us-east-1'});

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context);
    alexa.dynamoDBTableName = 'ClassroomBriefingAttributes';
    alexa.registerHandlers(handlers);
    alexa.execute();
};

function initializeBriefingNotes(attributes) {
    if (attributes.briefingNotes == undefined) {
        attributes.briefingNotes = {

            "1111": {
                "2018-07-03": ["Hi there, and welcome to Alexa Skills 101. I am the Eagle Expert, and soon I will be the best teaching assistant professors have ever had. I have many skills that will help in the classroom. Today, I will be demonstrating a few of these features through a mock classroom environment."],
                "2018-11-02": ["Hello 2"],
                "2018-11-03": ["Hello 3"]
            },
            "2222": {
                "2018-11-01": ["Hello 1"],
                "2018-11-02": ["Hello 2"],
                "2018-11-03": ["Hello 3"]
            }
        }
    }
}

const handlers = {

    'LaunchRequest': function () {
        console.log('LaunchRequest');
        const speechOutput = 'Hello, and welcome to the Classroom Briefing skill. Would you like me to play a briefing, or add a briefing note?';
        this.response.speak(speechOutput).listen('Would you like me to play a briefing, or add a briefing note?');
        this.emit(':responseReady');
    },

    'PlayBriefing': function () {
        initializeBriefingNotes(this.attributes);
        //we may need to adjust the else if conditions depending on how we choose to set up/retrieve the briefings -> from google sheets? hardcoded for the demo?
        if (this.event.request.dialogState !== 'COMPLETED') {
            this.emit(':delegate');
        } else if (!this.attributes.briefingNotes.hasOwnProperty(this.event.request.intent.slots.courseNumber.value) ||
                   !this.event.request.intent.slots.courseNumber.value) {
            let speechOutput = "I'm sorry, I couldn't find that course number. For which course would you like me to play your briefing notes?";
            let slotToElicit = "courseNumber";
            this.emit(':elicitSlot', slotToElicit, speechOutput, speechOutput);
        } else if (!this.attributes.briefingNotes[this.event.request.intent.slots.courseNumber.value].hasOwnProperty(this.event.request.intent.slots.classDate.value) ||
                   !this.event.request.intent.slots.classDate.value) {
            let speechOutput = "I'm sorry, I couldn't find that class date. For which date would you like me to play your briefing notes?";
            let slotToElicit = "classDate";
            this.emit(':elicitSlot', slotToElicit, speechOutput, speechOutput);
        } else {
            let courseNumber = this.event.request.intent.slots.courseNumber.value;
            let classDate = this.event.request.intent.slots.classDate.value;
            let notesAccessed = this.attributes.briefingNotes[courseNumber][classDate];
            let speechOutput = "";
            if (notesAccessed.length == 1) {
                speechOutput = notesAccessed + '<break time = "1s"/>' + " What else can I do for you today?";
            } else {
                notesAccessed.forEach(note => {
                    speechOutput += '<break time = "1s"/>' + `Note ${notesAccessed.indexOf(note) + 1}: "${note}" `;
                    console.log("*** adding note to speechOutput");
                });
                speechOutput += '<break time = "1s"/>' + " What else can I do for you today?"
            }
            this.response.speak(speechOutput).listen('What else can I do for you today?');
            this.emit(':responseReady');
        }
    },

    'AddBriefingNote': function () {
        initializeBriefingNotes(this.attributes);
        if (this.event.request.dialogState !== 'COMPLETED') {
            this.emit(':delegate');
        } else if (!this.event.request.intent.slots.noteContent.value) {
            let speechOutput = "What briefing note would you like to add?";
            let slotToElicit = "noteContent";
            this.emit(':elicitSlot', slotToElicit, speechOutput, speechOutput);
        } else {
            console.log('*** noteContent: ' + this.event.request.intent.slots.noteContent.value);
            this.attributes.noteContent = this.event.request.intent.slots.noteContent.value;
            let speechOutput = "Which course number should I add this note to?";
            this.response.speak(speechOutput).listen(speechOutput);
            this.emit(':responseReady');
        }
    },

    'SpecifyCourseNumber': function () {
        console.log('*** SpecifyCourseNumber');
        if (this.event.request.dialogState !== 'COMPLETED') {
            console.log('*** Trying to obtain courseNumber');
            this.emit(':delegate');
        } else if (!this.attributes.briefingNotes.hasOwnProperty(this.event.request.intent.slots.courseNumber.value)) {
            console.log('*** Invalid courseNumber');
            let speechOutput = "I'm sorry, I can't find that course number. Which course number should I add this note to?";
            let slotToElicit = 'courseNumber';
            this.emit(':elicitSlot', slotToElicit, speechOutput, speechOutput);
        } else {
            console.log('*** I have the courseNumber: ' + this.event.request.intent.slots.courseNumber.value);
            this.attributes.courseNumber = this.event.request.intent.slots.courseNumber.value;
            let speechOutput = "And for which date should I add this note?"
            this.response.speak(speechOutput).listen("For which date should I add this note?");
            this.emit(':responseReady')
        }
    },

    'SpecifyClassDate': function () {
        console.log('obtaining class date');
        if (this.event.request.dialogState !== 'COMPLETED') {
            this.emit(':delegate');
        } else if (!this.attributes.briefingNotes[this.attributes.courseNumber].hasOwnProperty(this.event.request.intent.slots.classDate.value)) {
            let speechOutput = "I'm sorry, I couldn't find that class date. For which date would you like me to add this note?";
            let slotToElicit = "classDate";
            this.emit(':elicitSlot', slotToElicit, speechOutput, speechOutput);
        } else {
            this.attributes.date = this.event.request.intent.slots.classDate.value;
            this.attributes.briefingNotes[this.attributes.courseNumber][this.attributes.date].push(this.attributes.noteContent);
            let speechOutput = `Great, I've added your note for course <say-as interpret-as="spell-out">${this.attributes.courseNumber}</say-as> on ${this.attributes.date}. What else can I do for you today?`;
            this.response.speak(speechOutput).listen("If you'd like me to add another note or play a briefing for you, just let me know.");
            this.emit(':responseReady');
        }
    },

    'AMAZON.HelpIntent': function () {
        const speechOutput = 'This is the Classroom Briefing skill. You can ask me to play a briefing or add a briefing. What would you like to do?';
        this.response.speak(speechOutput);
        this.emit(':responseReady');
    },

    'AMAZON.CancelIntent': function () {
        this.response.speak('Have a nice day!');
        this.emit(':responseReady');
    },

    'AMAZON.StopIntent': function () {
        this.response.speak('See you later!');
        this.emit(':responseReady');
    },

    'Unhandled': function() {
        let speechOutput = "Sorry, I did not understand that command. You can ask me to play a briefing or add a briefing. What would you like to do?";
        this.response.speak(speechOutput).listen(speechOutput);
    }
};