'use strict';
const fs = require("fs");
const Pool = require("pg").Pool;
const request = require('request');
const fastcsv = require("fast-csv");
var https = require("https");
var url = require("url");
const {PythonShell} = require('python-shell');


const pool = new Pool({
    host: process.env.PG_CONFIG_HOST,
    user: process.env.PG_CONFIG_USER,
    database: process.env.PG_CONFIG_DATABASE,
    password: process.env.PG_CONFIG_PASSWORD,
    port: 5432
});
// const config = require('./config');
// const pg= require('pg');
// const {Client} = pg;
// const pool = new pool({
//     connectionString: process.env.DATABASE_URL,
//     ssl: false,
// });

// client.connect();

module.exports = {
   
    saveData: function (callback, csv_url, userId) {

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

            const queryCreat =
                'CREATE TABLE csvData' + userId + '(id SERIAL PRIMARY KEY, invoiceno varchar(450) NOT NULL, stockcode varchar(450) NOT NULL, description varchar(450) NOT NULL, quantity varchar(450) NOT NULL, invoicedate varchar(450) NOT NULL, unitprice varchar(450) NOT NULL, customerid varchar(450) NOT NULL, country varchar(450) NOT NULL)';
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
                                        console.log("display result")
                                    } finally {
                                        done();
                                    }
                                });
                        });
                    } finally {
                        done();
                    }
                });


            });

            console.log("display python script part")
        });

        req.on("error", function (err) {
            // handle error
            console.log(error);
            callback(false);
        });

    }
}
