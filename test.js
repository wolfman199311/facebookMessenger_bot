const Pool = require("pg").Pool;
const Json2csvParser = require("json2csv").Parser;
const fs = require("fs");
var json2xls = require('json2xls');
// Create a connection to the database
const pool = new Pool({
    host: "localhost",
    user: "postgres",
    database: "testdb",
    password: "admin",
    port: 5432
});

// open the PostgreSQL connection
pool.connect((err, client, done) => {
    if (err) throw err;

    client.query("SELECT * FROM category", (err, res) => {
        done();

        if (err) {
            console.log(err.stack);
        } else {
            const jsonData = JSON.parse(JSON.stringify(res.rows));
            console.log("jsonData", jsonData);

            const json2csvParser = new Json2csvParser({ header: true });
            // const csv = json2csvParser.parse(jsonData);

            // fs.writeFile("www.xlsx", xlsx, function(error) {
            //   if (error) throw error;
            //   console.log("Write to bezkoder_postgresql_fs.csv successfully!");
            var xls = json2xls(jsonData);
            // var filename = "qqq.xlsx";
            // var tempFile = fs.openSync(filename, 'r');
            // // try commenting out the following line to see the different behavior
            // fs.closeSync(tempFile);

            // fs.unlinkSync(filename, );
            fs.unlink("www.xlsx", (err) => {
                if (err) {
                    console.log("failed to delete local image:" + err);
                }
                console.log('successfully deleted local image');
                fs.writeFile("qqq.xlsx", xls, function (error) {
                    if (error) throw error;
                    console.log("Write to bezkoder_postgresql_fs.csv successfully!");
                });

            });
            // fs.writeFileSync('www.xlsx', xls, 'binary');
        }
    });
});
