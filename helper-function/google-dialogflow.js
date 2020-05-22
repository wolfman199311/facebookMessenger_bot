'use strict';
const dialogflow = require('dialogflow').v2beta1;
const config = require('../config');
const structjson = require('../structjson.js');

// Your google dialogflow project-id
const projectId = config.GOOGLE_PROJECT_ID;

// KnowledgeBasePath
let one = 'projects/businessgrowthmentor-lgxlwf/knowledgeBases/ODcyNjU2MjEwNTg5MDcwMTMxMg';
let two = 'projects/businessgrowthmentor-lgxlwf/knowledgeBases/MTM2OTA2NTQ3OTUxNTk4MzA1Mjg';
let three = 'projects/businessgrowthmentor-lgxlwf/knowledgeBases/NDI0Mjk0NzIwMTg2NjY2MTg4OA';
let four = 'projects/businessgrowthmentor-lgxlwf/knowledgeBases/OTA3ODk2ODc3NjczMjQ0MjYyNA';
let five = 'projects/businessgrowthmentor-lgxlwf/knowledgeBases/MTgzMTkyMjkzMTIxODk4NTc3OTI';

// Configuration for the client
const credentials = {
    credentials: {
        private_key: config.GOOGLE_PRIVATE_KEY,
        client_email: config.GOOGLE_CLIENT_EMAIL
    }
}

// Create a session client
const sessionClient = new dialogflow.SessionsClient(credentials);

const detectIntent = async (queryText, sessionId) => {

    // Create a sessionPath for the senderId
    let sessionPath = sessionClient.sessionPath(projectId, sessionId);

    let request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: queryText,
                languageCode: 'en-US',
            }
        },
        queryParams: {
            knowledgeBaseNames: [one, two, three, four, five]
        }
    };

    try {
        let responses = await sessionClient.detectIntent(request);
        let result = responses[0].queryResult;
        let outputContexts = result.outputContexts;
        let intentName = result.intent.displayName;
        if (result.knowledgeAnswers && result.knowledgeAnswers.answers) {
            let answers = result.knowledgeAnswers.answers;
            return {
                status: 200,
                text: answers[0].answer
            }
        } else {
            return {
                status: 200,
                text: result.fulfillmentMessages[0].text.text[0],
                intentName: intentName,
                outputContexts: outputContexts
            }
        }
    } catch (error) {
        return {
            status: 401
        };
    }
};

module.exports = {
    detectIntent
}
