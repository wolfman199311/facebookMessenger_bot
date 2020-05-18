
"use strict";
const fs = require("fs");
const Pool = require("pg").Pool;
const fastcsv = require("fast-csv");
var xlsx = require('node-xlsx');
var https = require("https");
var url = require("url");

// create a new connection to the database
const pool = new Pool({
    host: "localhost",
    user: "postgres",
    database: "testdb",
    password: "admin",
    port: 5432
});

const userId = "42245252";
var tablename = 'csvData' + userId;
const queryDelete = 'DELETE FROM ' + tablename;
const queryCreat =
    'CREATE TABLE ' + tablename + '(id SERIAL PRIMARY KEY, invoiceno varchar(450) NOT NULL, stockcode varchar(450) NOT NULL, description varchar(450) NOT NULL, quantity varchar(450) NOT NULL, invoicedate varchar(450) NOT NULL, unitprice varchar(450) NOT NULL, customerid varchar(450) NOT NULL, country varchar(450) NOT NULL)';
console.log(queryCreat);
const query =
    'INSERT INTO csvData' + userId + '(InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID, Country) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';

var url = "https://cdn.fbsbx.com/v/t59.2708-21/97244361_173244120675140_9216578399319883776_n.xlsx/Book1-3.xlsx?_nc_cat=111&_nc_sid=0cab14&_nc_ohc=2nu_VI6RsZoAX928D3A&_nc_ht=cdn.fbsbx.com&oh=8683367f97c0f3ad13768cac98d764d1&oe=5EC2B467";

https.get(url, (res) => {
    debugger
    const {
        statusCode
    } = res;
    const contentType = res.headers['content-type'];
    console.log(`The type of the file is : ${contentType}`)
    let error;
    if (statusCode !== 200) {
        error = new Error(`Request Failed.\n` +
            `Status Code: ${statusCode}`);
    }
    if (error) {
        console.error(error.message);
        // consume response data to free up memory
        res.resume();
        return;
    }
    res.setEncoding('binary');
    let rawData = '';
    res.on('data', (chunk) => {
        rawData += chunk;
    });
    res.on('end', () => {
        try {
            // And / Or just put it in a file
            var xlsxfilename = tablename + '.xlsx';
            fs.writeFile(xlsxfilename, rawData, 'binary', (err) => {
                if (err) throw err;
                console.log("Successfully saved XLSX file.");
                const parsedData = xlsxToCSVFunction(rawData);
                console.log("Write to bezkoder_postgresql_fs.csv successfully!");
                var command = '././' + filefullname;
                var comport = 6;

                var options = {
                    scriptPath: 'python/',
                    args: [command, comport], // pass arguments to the script here
                };

                PythonShell.run('script.py', options, function (err, results) {
                    if (err) {
                        console.log(err + "That is definitely not Excel .xls format. Open it with a text editor (e.g. Notepad) that won't take any notice of the (incorrect) .xls extension and see for yourself.");

                    } else {
                        console.log('results: %j', results);
                        results.forEach(item => {
                            console.log(item);
                            var i = 0;
                            if (i < 10) {
                                fbService.sendTextMessage(IDname, item);
                                i++;
                            }
                            fbService.sendTextMessage(IDname, item);
                        });
                    }

                });

            });
            // console.log(parsedData);
        } catch (e) {
            console.error(e.message);
        }
    });
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});


function xlsxToCSVFunction(rawData) {
    // return rawData //you should return the csv file here whatever your tools are
    var obj = xlsx.parse("filefullname.xlsx"); // parses a file
    var rows = [];
    var writeStr = "";

    //looping through all sheets
    for (var i = 0; i < obj.length; i++) {
        var sheet = obj[i];
        //loop through all rows in the sheet
        for (var j = 0; j < sheet['data'].length; j++) {
            //add the row to the rows array
            rows.push(sheet['data'][j]);
        }
    }

    //creates the csv string to write it to a file
    for (var i = 0; i < rows.length; i++) {
        writeStr += rows[i].join(",") + "\n";
    }

    //writes to a file, but you will presumably send the csv as a      
    //response instead
    var csvfilename = tablename + '.csv';
    fs.writeFile(csvfilename, writeStr, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("filefullname.csv was saved in the current directory!");
        let stream = fs.createReadStream("filefullname.csv");
        let csvData = [];
        let csvStream = fastcsv
            .parse()
            .on("data", function (data) {
                csvData.push(data);
            })
            .on("end", function () {
                // remove the first line: header
                csvData.shift();
                // console.log(csvData);

                // connect to the PostgreSQL database
                // save csvData

                pool.connect((err, client, done) => {
                    try {
                        client.query(queryCreat)
                            .then((err, res) => {
                                csvData.forEach(row => {
                                    client.query(query, row, (err, res) => {
                                        if (err) throw err;
                                        else {
                                            console.log("inserted ${res.rowCount} row , ${row}");

                                        }
                                    });
                                });
                            }).catch(e => {
                                console.log(e);
                                client.query(queryDelete)
                                    .then((err, res) => {
                                        console.log("delete database");
                                        //insert record.
                                        csvData.forEach(row => {
                                            client.query(query, row, (err, res) => {
                                                if (err) throw err;
                                                else {
                                                    console.log("inserted ${res.rowCount} row , ${row}");

                                                }
                                            });
                                        });
                                    });
                            });
                    } catch (err) {
                        console.log("err");
                    }
                })

            });

        stream.pipe(csvStream);
    });
}

