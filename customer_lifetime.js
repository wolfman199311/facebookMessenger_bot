'use strict';
const fs = require("fs");
const Pool = require("pg").Pool;
// const request = require('request');
const fastcsv = require("fast-csv");
var json2xls = require('json2xls');
var https = require("https");
var url = require("url");
const fbService = require('./fb-service');


const { PythonShell } = require('python-shell');

const pool = new Pool({
    host: process.env.PG_CONFIG_HOST,
    user: process.env.PG_CONFIG_USER,
    database: process.env.PG_CONFIG_DATABASE,
    password: process.env.PG_CONFIG_PASSWORD,
    port: 5432
});

module.exports = {

    pythonpy: function (callback, url, userId) {
        var tablename = 'csvData' + userId;
        let self = module.exports;
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
                    fs.writeFile(xlsxfilename, rawData, 'binary', async (err) => {
                        if (err) throw err;
                        console.log("Successfully saved XLSX file.");
                        const result = await self.saveData.bind(null, tablename, userId);
                        console.log("Write to bezkoder_postgresql_fs.csv successfully!");
                        var command = '././' + xlsxfilename;
                        var comport = 6;

                        var options = {
                            scriptPath: 'python/',
                            args: [command, comport], // pass arguments to the script here
                        };

                        PythonShell.run('script.py', options, function (err, results) {
                            if (err) {
                                console.log(err);
                                fbService.sendTextMessage(userId, "cannot calculate customer lifetime value, because that is definitely not Excel .xls format. Open it with a text editor (e.g. Notepad) that won't take any notice of the (incorrect) .xls extension and see for yourself.");
                            } else {
                                console.log('results: %j', results);
                                var i = 0;
                                async function resolveAfterXSeconds(x) {
                                    return new Promise(resolve => {
                                        setTimeout(() => {
                                            resolve(x);
                                        }, x);
                                    });
                                }
                                results.forEach(async (item, index, array) => {

                                    // if (i < 10) {
                                    await resolveAfterXSeconds(5000);
                                    console.log(typeof(item));
                                    console.log(array.length, item);
                                    fbService.sendTextMessage(userId, item);
                                    i++;
                                    // }
                                    if (i == 10 || array.length == i) {
                                        callback(true);
                                        // fbService.sendTextMessage(userId, "item");
                                    }
                                });
                            }

                        });

                    });
                } catch (e) {
                    callback(false);
                    console.error(e.message);
                }
            });
        }).on('error', (e) => {
            console.error(`Got error: ${e.message}`);
        });

    },

    saveData: function (tablename, userId) {
        const queryDelete = 'DELETE FROM ' + tablename;
        const queryCreat =
            'CREATE TABLE ' + tablename + '(id SERIAL PRIMARY KEY, invoiceno varchar(450) NOT NULL, stockcode varchar(450) NOT NULL, description varchar(450) NOT NULL, quantity varchar(450) NOT NULL, invoicedate varchar(450) NOT NULL, unitprice varchar(450) NOT NULL, customerid varchar(450) NOT NULL, country varchar(450) NOT NULL)';
        const query =
            'INSERT INTO ' + tablename + '(InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID, Country) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';


        var xlsxfilename = tablename + '.xlsx';
        var obj = xlsx.parse(xlsxfilename); // parses a file
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
            let stream = fs.createReadStream(csvfilename);
            let csvData = [];
            let csvStream = fastcsv
                .parse()
                .on("data", function (data) {
                    csvData.push(data);
                })
                .on("end", function () {
                    // remove the first line: header
                    csvData.shift();

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
                                            var count  = 0;
                                            csvData.forEach((row, index, array) => {
                                                client.query(query, row, (err, res) => {
                                                    if (err) throw err;
                                                    else {
                                                        count++;
                                                        console.log("inserted ${res.rowCount} row , ${row}");
                                                        if (array.length == count){
                                                            fbService.sendTextMessage(userId, "saved csvfile successfully.");
                                                        }

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


    },
}




