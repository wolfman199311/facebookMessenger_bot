const {google} = require('googleapis');
const config = require('../config');

const SCOPES = 'https://www.googleapis.com/auth/calendar';

const CREDENTIALS = {
    client_email: config.GOOGLE_CLIENT_EMAIL,
    private_key: config.GOOGLE_PRIVATE_KEY,
    projectId : config.GOOGLE_PROJECT_ID,
};
// Your google calendar id
const calendarId = config.CALENDAR_ID;
const calendar = google.calendar({version : "v3"});

const auth = new google.auth.JWT(
    CREDENTIALS.client_email,
    null,
    CREDENTIALS.private_key,
    SCOPES
);

// let event = {
//     'summary': `Appointment for ${name}.`,
//     'description': `Customer mobile number ${number}.`,
//     'start': {
//         'dateTime': calenderDates['start'],
//         'timeZone': TIMEZONE
//     },
//     'end': {
//         'dateTime': calenderDates['end'],
//         'timeZone': TIMEZONE
//     }
// };

const insertEvent = async (event) => {

    let response = await calendar.events.insert({
        auth: auth,
        calendarId: calendarId,
        resource: event
    });

    if (response['status'] == 200 && response['statusText'] === 'OK') {
        return 1;
    } else {
        return 0;
    }
};

const getEvents = async (dateTimeStart, dateTimeEnd, timeZone) => {

    let response = await calendar.events.list({
        auth: auth,
        calendarId: calendarId,
        timeMin: dateTimeStart,
        timeMax: dateTimeEnd,
        timeZone: timeZone
    });

    let len = response['data']['items'].length;

    return len;
};

module.exports = {
    insertEvent,
    getEvents
}
