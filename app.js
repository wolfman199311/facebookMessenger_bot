'use strict';

const dialogflow = require('dialogflow').v2beta1;
const config = require('./config');
const express = require('express');
const crypto = require('crypto');
const { Client } = require('pg');
const bodyParser = require('body-parser');
const request = require('request');
const {google} = require('googleapis');
const TIMEOFFSET = '±00:00';

var app = express();
const uuid = require('uuid');




const userService = require('./user');
const customer_lifetime = require('./customer_lifetime');

let dialogflowService = require('./dialogflow-service');
const fbService = require('./fb-service');


const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const session = require('express-session');
const broadcast = require('./routes/broadcast');
let one= 'projects/businessgrowthmentor-lgxlwf/knowledgeBases/ODcyNjU2MjEwNTg5MDcwMTMxMg';
let two= 'projects/businessgrowthmentor-lgxlwf/knowledgeBases/MTM2OTA2NTQ3OTUxNTk4MzA1Mjg';
let three= 'projects/businessgrowthmentor-lgxlwf/knowledgeBases/NDI0Mjk0NzIwMTg2NjY2MTg4OA';
let four= 'projects/businessgrowthmentor-lgxlwf/knowledgeBases/OTA3ODk2ODc3NjczMjQ0MjYyNA';
let five= 'projects/businessgrowthmentor-lgxlwf/knowledgeBases/MTgzMTkyMjkzMTIxODk4NTc3OTI';

const SCOPES = 'https://www.googleapis.com/auth/calendar';

const GD = require('./helper-function/google-dialogflow');
const GC = require('./helper-function/google-calendar');
const DT = require('./helper-function/date-time-function');


// Messenger API parameters
if (!config.FB_PAGE_TOKEN) {
    throw new Error('missing FB_PAGE_TOKEN');
}
if (!config.FB_VERIFY_TOKEN) {
    throw new Error('missing FB_VERIFY_TOKEN');
}
if (!config.GOOGLE_PROJECT_ID) {
    throw new Error('missing GOOGLE_PROJECT_ID');
}
if (!config.DF_LANGUAGE_CODE) {
    throw new Error('missing DF_LANGUAGE_CODE');
}
if (!config.GOOGLE_CLIENT_EMAIL) {
    throw new Error('missing GOOGLE_CLIENT_EMAIL');
}
if (!config.GOOGLE_PRIVATE_KEY) {
    throw new Error('missing GOOGLE_PRIVATE_KEY');
}
if (!config.FB_APP_SECRET) {
    throw new Error('missing FB_APP_SECRET');
}
if (!config.SERVER_URL) { //used for ink to static files
    throw new Error('missing SERVER_URL');
}
if (!config.PG_CONFIG) { //pg config
    throw new Error('missing PG_CONFIG');
}
if (!config.FB_APP_ID) { //app id
    throw new Error('missing FB_APP_ID');
}



app.set('port', (process.env.PORT || 5000))

//verify request came from facebook
app.use(bodyParser.json({
    verify: verifyRequestSignature

}));

//serve static files in the public directory
app.use(express.static('public'));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}));

// Process application/json
app.use(bodyParser.json());





const credentials = {
    client_email: config.GOOGLE_CLIENT_EMAIL,
    private_key: config.GOOGLE_PRIVATE_KEY,
};

const sessionClient = new dialogflow.SessionsClient(
    {
        projectId: config.GOOGLE_PROJECT_ID,
        credentials
    }
);


const sessionIds = new Map();
const usersMap = new Map();
// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})


// for Facebook verification
app.get('/webhook/', function (req, res) {
    console.log("request");
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === config.FB_VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.sendStatus(403);
    }
})


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
 app.post('/webhook/', function (req, res) {
     var data = req.body;
     console.log(JSON.stringify(data));



    // Make sure this is a page subscription
    if (data.object == 'page') {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function (pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;

            // Iterate over each messaging event
            pageEntry.messaging.forEach(function (messagingEvent) {
                if (messagingEvent.optin) {
                    receivedAuthentication(messagingEvent);
                } else if (messagingEvent.message) {
                    receivedMessage(messagingEvent);
                } else if (messagingEvent.delivery) {
                    receivedDeliveryConfirmation(messagingEvent);
                } else if (messagingEvent.postback) {
                    receivedPostback(messagingEvent);
                } else if (messagingEvent.read) {
                    receivedMessageRead(messagingEvent);
                } else if (messagingEvent.account_linking) {
                    receivedAccountLink(messagingEvent);
                } else {
                    console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                }
            });
        });

        // Assume all went well.
        // You must send back a 200, within 20 seconds
        res.sendStatus(200);
    }
});

function setSessionAndUser(senderID) {
    if (!sessionIds.has(senderID)) {
        sessionIds.set(senderID, uuid.v1());
    }

    if (!usersMap.has(senderID)) {
        userService.addUser(function (user) {
            usersMap.set(senderID, user);
        }, senderID);
    }
}


function receivedMessage(event) {

    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;
    setSessionAndUser(senderID);
    var isEcho = message.is_echo;
    var messageId = message.mid;
    var appId = message.app_id;
    var metadata = message.metadata;

    // You may get a text or attachment but not both
    var messageText = message.text;
    var messageAttachments = message.attachments;
    var quickReply = message.quick_reply;

    if (isEcho) {
        handleEcho(messageId, appId, metadata);
        return;
    } else if (quickReply) {
        handleQuickReply(senderID, quickReply, messageId);
        return;
    }


    if (messageText) {
        //send message to api.ai
        sendToDialogFlow(senderID, messageText);
    } else if (messageAttachments) {
        handleMessageAttachments(messageAttachments, senderID);
    }
}


function handleMessageAttachments(messageAttachments, senderID) {
    var csv_url;
    messageAttachments.forEach(item => {
        csv_url = item.payload.url;
    });
    console.log(csv_url);

    //var uri = "https://cdn.fbsbx.com/v/t59.2708-21/97269798_268455104293348_9172572718455848960_n.csv/test.csv?_nc_cat=108&_nc_sid=0cab14&_nc_ohc=o3tzWXmghasAX_9K7vA&_nc_ht=cdn.fbsbx.com&oh=0693971577037451dff112f8e80cce2b&oe=5EBE0231";

    customer_lifetime.pythonpy(function (result) {
        if (result) {
            fbService.sendTextMessage(senderID, "Here's your customer liftime value. In marketing, customer life time value, lifetime customer value, or lifetime value is a prediction of the net profit attributed to the entire future relationship with a customer. The two things I would recommend are either trying to upsell one of your products or have a solid email marketing campaign in place. Which would you like to learn about?");
        } else {
            fbService.sendTextMessage(senderID, "Your Excel file is not correct. Please try other one.");
        }
    }, csv_url, senderID);
    //sendTextMessage(senderID, "Attachment received. Thank you.");
    //sendTextMessage(senderID, "Your average customer lifetime value is xxx. Would you like to improve this?  ");

}

function handleQuickReply(senderID, quickReply, messageId) {
    var quickReplyPayload = quickReply.payload;
    switch (quickReplyPayload) {
        case 'NEWS_PER_WEEK':
            userService.newsletterSettings(function (updated) {
                if (updated) {
                    fbService.sendTextMessage(senderID, "Thank you for subscribing! " +
                        "If you want to unsubscribe just write 'unsubscribe from newsletter'");
                } else {
                    fbService.sendTextMessage(senderID, "Newsletter is not available at this moment." +
                        "Try again later!");
                }
            }, 1, senderID);
            break;
        case 'NEWS_PER_MONTH':
            userService.newsletterSettings(function (updated) {
                if (updated) {
                    fbService.sendTextMessage(senderID, "Thank you for subscribing!" +
                        "If you want to unsubscribe just write 'unsubscribe from newsletter'");
                } else {
                    fbService.sendTextMessage(senderID, "Newsletter is not available at this moment." +
                        "Try again later!");
                }
            }, 2, senderID);
            break;

        case 'Email Marketing':

            fbService.sendTextMessage(senderID, "Awesome, we’ll set it up together step by step. Once you’re ready to start, say “let’s go!”  ");

            break;

        case 'Upselling Products':

            fbService.sendTextMessage(senderID, "I can give you some tips for upselling to loyal customers, pick one!");

            break;

        default:
            dialogflowService.sendTextQueryToDialogFlow(sessionIds, handleDialogFlowResponse, senderID, quickReplyPayload);
            break;
    }
    console.log("Quick reply for message %s with payload %s", messageId, quickReplyPayload);
    //send payload to api.ai
    //sendToDialogFlow(senderID, quickReplyPayload);
}

//https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-echo
function handleEcho(messageId, appId, metadata) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s", messageId, appId, metadata);
}
function handleDialogFlowAction(sender, action, messages, contexts, parameters) {
    switch (action) {
        default:
            //unhandled action, just send back the text
            handleMessages(messages, sender);
    }
}
function handleDialogFlowResponse(sender, response) {
    let responseText = response.fulfillmentMessages.fulfillmentText;

    let messages = response.fulfillmentMessages;
    let action = response.action;
    let contexts = response.outputContexts;
    let parameters = response.parameters;

    sendTypingOff(sender);

    if (isDefined(action)) {
        handleDialogFlowAction(sender, action, messages, contexts, parameters);
    } else if (isDefined(messages)) {
        handleMessages(messages, sender);
    } else if (responseText == '' && !isDefined(action)) {
        //dialogflow could not evaluate input.
        sendTextMessage(sender, "I'm not sure what you want. Can you be more specific?");
    } else if (isDefined(responseText)) {
        sendTextMessage(sender, responseText);
    }
}

async function sendToDialogFlow(sender, textString, params) {

    sendTypingOn(sender);

    try {
        const sessionPath = sessionClient.sessionPath(
            config.GOOGLE_PROJECT_ID,
            sessionIds.get(sender)
        );

        const request = {
            session: sessionPath,
            queryInput: {
                text: {
                    text: textString,
                    languageCode: config.DF_LANGUAGE_CODE,
                },
            },
            queryParams: {
                payload: {
                    data: params
                }
            }
        };
        const responses = await sessionClient.detectIntent(request);

        const result = responses[0].queryResult;
        handleDialogFlowResponse(sender, result);
    } catch (e) {
        console.log('error');
        console.log(e);
    }

}

function handleMessage(message, sender) {
    switch (message.message) {
        case "text": //text
            message.text.text.forEach((text) => {
                if (text !== '') {
                    sendTextMessage(sender, text);
                }
            });
            break;
        case "quickReplies": //quick replies
            let replies = [];
            message.quickReplies.quickReplies.forEach((text) => {
                let reply =
                {
                    "content_type": "text",
                    "title": text,
                    "payload": text
                }
                replies.push(reply);
            });
            sendQuickReply(sender, message.quickReplies.title, replies);
            break;
        case "image": //image
            sendImageMessage(sender, message.image.imageUri);
            break;
    }
}


function handleCardMessages(messages, sender) {

    let elements = [];
    for (var m = 0; m < messages.length; m++) {
        let message = messages[m];
        let buttons = [];
        for (var b = 0; b < message.card.buttons.length; b++) {
            let isLink = (message.card.buttons[b].postback.substring(0, 4) === 'http');
            let button;
            if (isLink) {
                button = {
                    "type": "web_url",
                    "title": message.card.buttons[b].text,
                    "url": message.card.buttons[b].postback
                }
            } else {
                button = {
                    "type": "postback",
                    "title": message.card.buttons[b].text,
                    "payload": message.card.buttons[b].postback
                }
            }
            buttons.push(button);
        }


        let element = {
            "title": message.card.title,
            "image_url": message.card.imageUri,
            "subtitle": message.card.subtitle,
            "buttons": buttons
        };
        elements.push(element);
    }
    sendGenericMessage(sender, elements);
}

function handleMessages(messages, sender) {
    let timeoutInterval = 1100;
    let previousType ;
    let cardTypes = [];
    let timeout = 0;
    for (var i = 0; i < messages.length; i++) {

        if ( previousType == "card" && (messages[i].message != "card" || i == messages.length - 1)) {
            timeout = (i - 1) * timeoutInterval;
            setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
            cardTypes = [];
            timeout = i * timeoutInterval;
            setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
        } else if ( messages[i].message == "card" && i == messages.length - 1) {
            cardTypes.push(messages[i]);
            timeout = (i - 1) * timeoutInterval;
            setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
            cardTypes = [];
        } else if ( messages[i].message == "card") {
            cardTypes.push(messages[i]);
        } else  {

            timeout = i * timeoutInterval;
            setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
        }

        previousType = messages[i].message;

    }
};




async function detectIntentKnowledge(
  projectId,
  sessionId,
  languageCode,
  knowledgeBaseId,
  query
) {
const sessionPath = sessionClient.projectAgentSessionPath(
  projectId,
  sessionId
);


// The audio query request
const request1 = {
  session: sessionPath,
  queryInput: {
    text: {
      text: query,
      languageCode: languageCode,
    },
  },
  queryParams: {
    knowledgeBaseNames: [one, two, three, four, five],
  },
};

const responses = await sessionClient.detectIntent(request1);
const result = responses[0].queryResult;
console.log(`Query text: ${result.queryText}`);
console.log(`Detected Intent: ${result.intent.displayName}`);
console.log(`Confidence: ${result.intentDetectionConfidence}`);
console.log(`Query Result: ${result.fulfillmentText}`);
if (result.knowledgeAnswers && result.knowledgeAnswers.answers) {
  const answers = result.knowledgeAnswers.answers;
  console.log(`There are ${answers.length} answer(s);`);
  answers.forEach(a => {
    console.log(`   answer: ${a.answer}`);
    console.log(`   confidence: ${a.matchConfidence}`);
    console.log(`   match confidence level: ${a.matchConfidenceLevel}`);
  });
}
}



function sendTextMessage(recipientId, text) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: text
        }
    }
    callSendAPI(messageData);
};


/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage(recipientId, imageUrl) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "image",
                payload: {
                    url: imageUrl
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a Gif using the Send API.
 *
 */
function sendGifMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "image",
                payload: {
                    url: config.SERVER_URL + "/assets/instagram_logo.gif"
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send audio using the Send API.
 *
 */
function sendAudioMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "audio",
                payload: {
                    url: config.SERVER_URL + "/assets/sample.mp3"
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 * example videoName: "/assets/allofus480.mov"
 */
function sendVideoMessage(recipientId, videoName) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "video",
                payload: {
                    url: config.SERVER_URL + videoName
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 * example fileName: fileName"/assets/test.txt"
 */
function sendFileMessage(recipientId, fileName) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "file",
                payload: {
                    url: config.SERVER_URL + fileName
                }
            }
        }
    };

    callSendAPI(messageData);
}



/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId, text, buttons) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: text,
                    buttons: buttons
                }
            }
        }
    };

    callSendAPI(messageData);
}


function sendGenericMessage(recipientId, elements) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: elements
                }
            }
        }
    };

    callSendAPI(messageData);
}


function sendReceiptMessage(recipientId, recipient_name, currency, payment_method,
    timestamp, elements, address, summary, adjustments) {
    // Generate a random receipt ID as the API requires a unique ID
    var receiptId = "order" + Math.floor(Math.random() * 1000);

    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "receipt",
                    recipient_name: recipient_name,
                    order_number: receiptId,
                    currency: currency,
                    payment_method: payment_method,
                    timestamp: timestamp,
                    elements: elements,
                    address: address,
                    summary: summary,
                    adjustments: adjustments
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
function sendQuickReply(recipientId, text, replies, metadata) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: text,
            metadata: isDefined(metadata) ? metadata : '',
            quick_replies: replies
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt(recipientId) {

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "mark_seen"
    };

    callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {


    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_on"
    };

    callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {


    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_off"
    };

    callSendAPI(messageData);
}

/*
 * Send a message with the account linking call-to-action
 *
 */
function sendAccountLinking(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: "Welcome. Link your account.",
                    buttons: [{
                        type: "account_link",
                        url: config.SERVER_URL + "/authorize"
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}
async function resolveAfterXSeconds(x) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(x);
        }, x * 1000);
    });
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v3.2/me/messages',
        qs: {
            access_token: config.FB_PAGE_TOKEN
        },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            if (messageId) {
                console.log("Successfully sent message with id %s to recipient %s",
                    messageId, recipientId);
            } else {
                console.log("Successfully called Send API for recipient %s",
                    recipientId);
            }
        } else {
            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
}
function sendBizNewsSubscribe(userId) {
    let responseText = "You can subscribe to our business growth newsletter here for all the latest hints and tips on improving your business ";

    let replies = [
        {
            "content_type": "text",
            "title": "Once per week",
            "payload": "NEWS_PER_WEEK"
        },
        {
            "content_type": "text",
            "title": "Once per month",
            "payload": "NEWS_PER_MONTH"
        }
    ];

    fbService.sendQuickReply(userId, responseText, replies);
}


// This route is to get the message



/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 *
 */
function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;
    setSessionAndUser(senderID);
    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    var payload = event.postback.payload;

    switch (payload) {

        case 'BIZ_ANALYTICS':
            //ask user to send a .csv
            sendTextMessage(senderID, "Awesome, to help you with that. I just need some data from you");
            break;
        case 'BIZ_NEWSLETTER':
            //get information from user before they subscribe
            sendBizNewsSubscribe(senderID);
            break;
        case 'BIZ_ADVICE':
            sendTextMessage(senderID, "Great! What would you like advice on?");
            break;
        case 'FACEBOOK_WELCOME':
            greetUserText(senderID);
            break;

        default:
            //unindentified payload
            sendTextMessage(senderID, "I'm sorry, I didn't understand your last message. I'm new and just a bot so it will take some time to train me. Can you repeat that again?");
            break;

    }

    console.log("Received postback for user %d and page %d with payload '%s' " +
        "at %d", senderID, recipientID, payload, timeOfPostback);

}
async function greetUserText(userId) {
    let user = usersMap.get(userId);
    if (!user) {
        await resolveAfterXSeconds(2);
        user = usersMap.get(userId);
    }
    if (user) {
        sendTextMessage(userId, 'Hey' + user.first_name + '! ' +
            'I can answer frequently asked questions for you ' +
            'What can I help you with?');
    } else {
        sendTextMessage(userId, 'Welcome! ' +
            'I can answer frequently asked questions for you ' +
            'What can I help you with?');
    }
}

async function bookCalendar() {
  let incomingData = req.body.entry[0].messaging[0];

            let senderId = incomingData.sender.id;
            let message = incomingData.message.text;

            console.log(`Incoming message --> ${message}`);
            console.log(`Incoming sender id --> ${senderId}`);

 let intentData = await GD.detectIntent(message, senderId);




 if (intentData.intentName === 'User Provides Time') {
                let fields = intentData.outputContexts[0].parameters.fields;

                let date = fields.date.stringValue;
                let time = fields.time.stringValue;

                // Check the event is there or not
                let dtc = DT.dateTimeForCalander(date, time);
                console.log(dtc);
                let dts = DT.dateTimeToString(date, time);
                let eventsLength = await GC.getEvents(dtc.start, dtc.end, 'Europe/London');

                if (eventsLength == 0) {
                    let event = {
                        'summary': `Demo appointment.`,
                        'description': `Sample description.`,
                        'start': {
                            'dateTime': dtc.start,
                            'timeZone': 'Europe/London'
                        },
                        'end': {
                            'dateTime': dtc.end,
                            'timeZone': 'Europe/London'
                        }
                    };
                    await GC.insertEvent(event);
                    await fbService.sendTextMessage(`Appointment is set on ${dts}`, sender);
                    res.status(200).send('EVENT_RECEIVED');
                } else {
                    await fbService.sendTextMessage(`Sorry, we are not available on ${dts}`, sender);
                    res.status(200).send('EVENT_RECEIVED');
        }
      }
    }





// The audio query request



/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 *
 */
function receivedMessageRead(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    // All messages before watermark (a timestamp) or sequence have been seen.
    var watermark = event.read.watermark;
    var sequenceNumber = event.read.seq;

    console.log("Received message read event for watermark %d and sequence " +
        "number %d", watermark, sequenceNumber);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 *
 */
function receivedAccountLink(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    var status = event.account_linking.status;
    var authCode = event.account_linking.authorization_code;

    console.log("Received account link event with for user %d with status %s " +
        "and auth code %s ", senderID, status, authCode);
}

/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var delivery = event.delivery;
    var messageIDs = delivery.mids;
    var watermark = delivery.watermark;
    var sequenceNumber = delivery.seq;

    if (messageIDs) {
        messageIDs.forEach(function (messageID) {
            console.log("Received delivery confirmation for message ID: %s",
                messageID);
        });
    }

    console.log("All message before %d were delivered.", watermark);
}


/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to
 * Messenger" plugin, it is the 'data-ref' field. Read more at
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfAuth = event.timestamp;

    // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
    // The developer can set this to an arbitrary value to associate the
    // authentication callback with the 'Send to Messenger' click event. This is
    // a way to do account linking when the user clicks the 'Send to Messenger'
    // plugin.
    var passThroughParam = event.optin.ref;

    console.log("Received authentication for user %d and page %d with pass " +
        "through param '%s' at %d", senderID, recipientID, passThroughParam,
        timeOfAuth);

    // When an authentication is received, we'll send a message back to the sender
    // to let them know it was successful.
    sendTextMessage(senderID, "Authentication successful");
}

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
    var signature = req.headers["x-hub-signature"];

    if (!signature) {
        throw new Error('Couldn\'t validate the signature.');
    } else {
        var elements = signature.split('=');
        var method = elements[0];
        var signatureHash = elements[1];

        var expectedHash = crypto.createHmac('sha1', config.FB_APP_SECRET)
            .update(buf)
            .digest('hex');

        if (signatureHash != expectedHash) {
            throw new Error("Couldn't validate the request signature.");
        }
    }
}

function isDefined(obj) {
    if (typeof obj == 'undefined') {
        return false;
    }

    if (!obj) {
        return false;
    }

    return obj != null;
}


// Spin up the server
app.listen(app.get('port'), function () {
    console.log('running on port', app.get('port'))
})
