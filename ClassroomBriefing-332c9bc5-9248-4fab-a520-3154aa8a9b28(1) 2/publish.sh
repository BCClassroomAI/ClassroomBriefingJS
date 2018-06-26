#!/bin/bash

rm ./ClassroomBriefing.zip

zip -r ./ClassroomBriefing.zip . -x "*.git*"

aws lambda update-function-code --function-name ClassroomBriefing --zip-file fileb://./ClassroomBriefing.zip
