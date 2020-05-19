const axios = require('axios');
const config = require('../config');

const TOKEN = process.env.FB_PAGE_TOKEN;

const sendMessage = async (message, senderId) => {

    let url = `https://graph.facebook.com/v2.6/me/messages?access_token=${TOKEN}`;
    let headers = {
        'Content-Type': 'application/json'
    }

    let fields = {
        messaging_type: "RESPONSE",
        recipient: {
            id: senderId
        },
        message: {
            text:"hello"
        }
    }

    try {
        let response = await axios.post(url, fields, { headers });

        if (response['status'] == 200 && response['statusText'] === 'OK') {
            return 1;
        } else {
            return 0;
        }
    } catch (error) {
        console.log(`Error at sendMessage Facebook --> ${error}`);
        return 0;
    }
};

module.exports = {
    sendMessage
}
