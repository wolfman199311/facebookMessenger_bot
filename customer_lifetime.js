'use strict';
const fs = require("fs");
const Pool = require("pg").Pool;
// const request = require('request');
const fastcsv = require("fast-csv");
var https = require("https");
var url = require("url");
const fbService = require('./fb-service');


const {PythonShell} = require('python-shell');


const pool = new Pool({
    host: process.env.PG_CONFIG_HOST,
    user: process.env.PG_CONFIG_USER,
    database: process.env.PG_CONFIG_DATABASE,
    password: process.env.PG_CONFIG_PASSWORD,
    port: 5432
});

module.exports = {
   
    saveData: function (callback, csv_url, userId) {
        let self = module.exports;

        var req = https.get(url.parse(csv_url), function (res) {
            if (res.statusCode !== 200) {
                return;
            }
            var data = [], dataLen = 0;
            var csvData = [];
            res.on("data", function (chunk) {
                data.push(chunk);
                dataLen += chunk.length;
            });

            var tablename = 'csvData'+userId;
            const queryCreat =
                'CREATE TABLE '  + tablename + '(id SERIAL PRIMARY KEY, invoiceno varchar(450) NOT NULL, stockcode varchar(450) NOT NULL, description varchar(450) NOT NULL, quantity varchar(450) NOT NULL, invoicedate varchar(450) NOT NULL, unitprice varchar(450) NOT NULL, customerid varchar(450) NOT NULL, country varchar(450) NOT NULL)';
            console.log(queryCreat);
            const query =
                'INSERT INTO csvData' + userId + '(InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID, Country) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
            res.on("end", function () {
                var buf = Buffer.concat(data);
                var datas = buf.toString();
                var str = datas.split("\n");
                // remove the first line: header
                str.shift();
                str.forEach(rows => {
                    var element = rows.split(",");
                    if (rows != "") {
                        csvData.push(element);
                    }
                })

                pool.connect((err, client, done) => {
                    if (err) throw err;

                    try {
                        //csvData.forEach(row => {
                        client.query(queryCreat, (err, res) => {
                            if (err) {
                                console.log("table already be created");
                            } 
                                pool.connect((err, client, done) => {
                                    if (err) callback(false);
                                    try {

                                        client.query("DELETE FROM category");
                                        callback(true);
                                        csvData.forEach(row => {
                                            client.query(query, row, (err, res) => {
                                                if (err) {
                                                    console.log(err.stack);
                                                } else {
                                                    console.log("inserted " + res.rowCount + " row:", row);
                                                }
                                            });
                                        });
                                        console.log("display result")
                                    } finally {
                                        console.log("display python script part")
                                        done();
                                    }
                                });
                        });
                    } finally {
                        done();
                    }
                });
                setTimeout(self.csvwriter.bind(null, userId, tablename), 5000);
            });

        });

        req.on("error", function (err) {
            // handle error
            console.log(error);
        });

    },
    csvwriter: function(IDname, tablename){
        console.log(IDname);
        console.log(tablename);
        var filefullname = tablename + '.xlsx';
        const ws = fs.createWriteStream(filefullname);

        pool.connect((err, client, done) => {
            if (err) throw err;
            var selectquery =
            'SELECT * FROM ' + tablename;
            client.query(selectquery, (err, res) => {
              done();
          
              if (err) {
                console.log(err.stack);
              } else {
                const jsonData = JSON.parse(JSON.stringify(res.rows));
                console.log("jsonData", jsonData);
          
                fastcsv
                  .write(jsonData, { headers: true })
                  .on("finish", function() {
                    console.log('Write to' + filefullname + 'successfully!');
                    var command = '././' + filefullname;
                    var comport = 6;

                    var options = {
                        scriptPath: 'python/',
                        args: [command, comport], // pass arguments to the script here
                    };

                    PythonShell.run('script.py', options, function (err, results) {
                        if (err) {
                            console.log("That is definitely not Excel .xls format. Open it with a text editor (e.g. Notepad) that won't take any notice of the (incorrect) .xls extension and see for yourself.");

                        };
                        console.log('results: %j', results);
                        var i = 0;
                        for (i = 0; i < 5; i++){
                            fbService.sendTextMessage(IDname, results[i]);
                        }
                    });


                  })
                  .pipe(ws);
              }
            });
          });
        
        // var command = '././Book1.xlsx';
        // var comport = 6;

        // var options = {
        //     scriptPath: 'python/',
        //     args: [command, comport], // pass arguments to the script here
        // };

        // PythonShell.run('script.py', options, function (err, results) {
        //     if (err) throw err;
        //     console.log('results: %j', results);
        // });
    }
}
