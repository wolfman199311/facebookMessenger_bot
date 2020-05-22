onst TIMEOFFSET = '+05:30';

// Converts the date and time from Dialogflow into
// January 18, 9:30 AM
const dateTimeToString = (date, time) => {

    let year = date.split('T')[0].split('-')[0];
    let month = date.split('T')[0].split('-')[1];
    let day = date.split('T')[0].split('-')[2];

    let hour = time.split('T')[1].split(':')[0];
    let minute = time.split('T')[1].split(':')[1];

    let newDateTime = `${year}-${month}-${day}T${hour}:${minute}`;

    let event = new Date(Date.parse(newDateTime));

    let options = { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };

    return event.toLocaleDateString('en-US', options);
};

// Get date-time string for calender
const dateTimeForCalander = (date, time) => {

    let year = date.split('T')[0].split('-')[0];
    let month = date.split('T')[0].split('-')[1];
    let day = date.split('T')[0].split('-')[2];

    let hour = time.split('T')[1].split(':')[0];
    let minute = time.split('T')[1].split(':')[1];

    let newDateTime = `${year}-${month}-${day}T${hour}:${minute}:00.000${TIMEOFFSET}`;

    let event = new Date(Date.parse(newDateTime));

    let startDate = event;
    let endDate = new Date(new Date(startDate).setHours(startDate.getHours()+1));

    return {
        'start': startDate,
        'end': endDate
    }
};

module.exports = {
    dateTimeForCalander,
    dateTimeToString
}
