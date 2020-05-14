
"use strict";

// var myPythonScriptPath = 'script.py';

// // Use python shell
// const {PythonShell} = require('python-shell');
// var pyshell = new PythonShell(myPythonScriptPath);
// var address = "D:\download\Online Retail.xlsx"
// pyshell.send(address);

// pyshell.on('message', function (message) {
//     // received a message sent from the Python script (a simple "print" statement)
//     console.log(message);
// });

// // end the input stream and allow the process to exit
// pyshell.end(function (err) {
//     if (err){
//         throw err;
//     };

//     console.log('finished');
// });

const { PythonShell } = require('python-shell');

var command = '././Online Retail.xlsx';
// var command = '././test.csv';
var comport = 6;

var options = {
    scriptPath: 'python/',
    args: [command, comport], // pass arguments to the script here
};

PythonShell.run('script.py', options, function (err, results) {
    if (err) throw err;
    console.log('results: %j', results);
});

const fs = require("fs");
const Pool = require("pg").Pool;
const fastcsv = require("fast-csv");
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

module.exports = {
    saveData: function () {
        var csv_url = "https://cdn.fbsbx.com/v/t59.2708-21/97269798_268455104293348_9172572718455848960_n.csv/test.csv?_nc_cat=108&_nc_sid=0cab14&_nc_ohc=ypAqgSuDcRwAX_wPA_d&_nc_ht=cdn.fbsbx.com&oh=1a8af45cf928385087e7ec25156520d0&oe=5EBD5971";
        console.log("okay");
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
            var userid = "235"
            const queryCreat =
                'CREATE TABLE csvData' + userid + '(id SERIAL PRIMARY KEY, firstName VARCHAR(40) NOT NULL, lastName VARCHAR(40) NOT NULL)';
            console.log(queryCreat);
            const query =
                "INSERT INTO category (InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID, Country) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";
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

                //const createquery = "CREATE TABLE IF NOT EXISTS category (username Text(45) NOT NULL, password varchar(450) NOT NULL, enabled integer NOT NULL DEFAULT '1',PRIMARY KEY (username))";

                pool.connect((err, client, done) => {
                    if (err) throw err;

                    try {

                        //csvData.forEach(row => {
                        client.query(queryCreat, (err, res) => {
                            if (err) {
                                console.log("err.stack");
                            }
                            console.log("created");
                            pool.connect((err, client, done) => {
                                if (err) throw err;

                                try {

                                    client.query("DELETE FROM category");
                                    csvData.forEach(row => {
                                        client.query(query, row, (err, res) => {
                                            if (err) {
                                                console.log(err.stack);
                                            } else {
                                                console.log("inserted " + res.rowCount + " row:", row);
                                            }
                                        });
                                    });
                                } finally {
                                    done();
                                    var lastName = "wolf";
                                    setTimeout(self.csvwriter(lastName), 2000);
                                }
                            });
                        });
                    } finally {
                        done();
                    }
                });
            });
        });


        req.on("error", function (err) {
            // handle error
            console.log(error);
        });
    },

    csvwriter: function (name) {
        console.log(name);
    }

}
