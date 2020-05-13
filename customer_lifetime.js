'use strict';
const fs = require("fs");
const Pool = require("pg").Pool;
const request = require('request');
const fastcsv = require("fast-csv");
var https = require("https");
var url = require("url");

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

    // addUser: function(callback, userId) {
    //     request({
    //         uri: 'https://graph.facebook.com/v3.2/' + userId,
    //         qs: {
    //             access_token: config.FB_PAGE_TOKEN
    //         }

    //     },
    //      function (error, response, body) {
    //         if (!error && response.statusCode == 200) {

    //             var user = JSON.parse(body);
    //             if (user.first_name != "undefined") {
    //                 var pool = new pg.Pool(config.PG_CONFIG);
    //                 pool.connect(function(err, client, done) {
    //                     if (err) {
    //                         return console.error('Error acquiring client', err.stack);
    //                     }
    //                     var rows = [];
    //                     client.query(`SELECT fb_id FROM users WHERE fb_id='${userId}' LIMIT 1`,
    //                         function(err, result) {
    //                             if (err) {
    //                                 console.log('Query error: ' + err);
    //                             } else {
    //                                 if (result.rows.length === 0) {
    //                                     let sql = 'INSERT INTO users (fb_id, first_name, last_name, profile_picture) ' +
    //                                         'VALUES ($1, $2, $3, $4)';
    //                                     client.query(sql,
    //                                         [
    //                                             userId,
    //                                             user.first_name,
    //                                             user.last_name,
    //                                             user.profile_pic
    //                                         ]);
    //                                 }
    //                             }
    //                         });

    //                     callback(user);
    //                 });
    //                 pool.end();
    //             } else {
    //                 console.log("Cannot get data for fb user with id",
    //                     userId);
    //             }
    //         } else {
    //             console.error(response.error);
    //         }

    //     });
    // },
    // readAllUsers: function(callback, newstype) {
    //     var pool = new pg.Pool(config.PG_CONFIG);
    //     pool.connect(function(err, client, done) {
    //         if (err) {
    //             return console.error('Error acquiring client', err.stack);
    //         }
    //         client
    //             .query(
    //                 'SELECT fb_id, first_name, last_name FROM users WHERE newsletter=$1',
    //                 [newstype],
    //                 function(err, result) {
    //                     if (err) {
    //                         console.log(err);
    //                         callback([]);
    //                     } else {
    //                         callback(result.rows);
    //                     };
    //                 });
    //     });
    //     pool.end();
    // },

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
                'CREATE TABLE csvData' + userId + '(id SERIAL PRIMARY KEY, firstName VARCHAR(40) NOT NULL, lastName VARCHAR(40) NOT NULL)';
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

                //console.log(csvData);

                //const createquery = "CREATE TABLE IF NOT EXISTS category (username Text(45) NOT NULL, password varchar(450) NOT NULL, enabled integer NOT NULL DEFAULT '1',PRIMARY KEY (username))";
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
        });

        req.on("error", function (err) {
            // handle error
            console.log(error);
            callback(false);
        });

    }
}
