/* This is importing the modules that we need to use in our project. */
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();

const {InfluxDB, Point} = require('@influxdata/influxdb-client')

const token = process.env.INFLUXDB_TOKEN
const url = 'http://localhost:8086'




/* Parsing the body of the request. */
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
/* Telling the server to use the public folder as a static folder. */
app.use(express.static("public"));



let org = `test`
let bucket = `test`



const data = JSON.parse(fs.readFileSync('./data/sensors', 'utf8'))

const point = new Point('weather')
    .tag('station', "piensg031")
    .floatField('temperature', data.measure[0].value)
    .floatField('luminosity', data.measure[3].value)
    .floatField('humidity', data.measure[2].value)
    .floatField('wind_heading', data.measure[4].value)
    .floatField('pressure', data.measure[1].value)


const client = new InfluxDB({url, token})
const  writeClient = client.getWriteApi(org, bucket, 'ns')
writeClient.writePoint(point)
writeClient.flush()




let queryClient = client.getQueryApi(org)
let fluxQuery = `from(bucket: "test")
 |> range(start: -5m)
 |> last()
|> filter(fn: (r) => r._measurement == "weather")
`

queryClient.queryRows(fluxQuery, {
  next: (row, tableMeta) => {
    const tableObject = tableMeta.toObject(row)
    console.log(tableObject)
  },
  error: (error) => {
    console.error('\nError', error)
  },
  complete: () => {
    console.log('\nSuccess')
  },
})

/* Starting the server. */
app.listen(process.env.PORT || 4000, function () {
  console.log("Server started");
});