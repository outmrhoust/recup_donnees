/* This is importing the modules that we need to use in our project. */
const fs = require("fs");
const nmea = require('@drivetech/node-nmea')
const {InfluxDB, Point} = require('@influxdata/influxdb-client')
require('dotenv').config()


const token = `${process.env.INFLUXDB_TOKEN}`
console.log(token)
const url = 'http://localhost:8086'



let org = `projet_sonde`
let bucket = `weather_data`
const client = new InfluxDB({url, token})
const  writeClient = client.getWriteApi(org, bucket, 'ns')


function writeFileToDB () {


  const data = JSON.parse(fs.readFileSync('/dev/shm/sensors', 'utf8'))
  const dataGPS = nmea.parse(fs.readFileSync('/dev/shm/gpsNmea', 'utf8').split('\n')[1])
  const dataRain = fs.readFileSync('/dev/shm/rainCounter.log', 'utf8').split('\n')[0]
  console.log(data.date)

  const point = new Point('weather')
    .tag('station', "piensg031")
    .floatField('temperature', data.measure[0].value)
    .floatField('pressure', data.measure[1].value)
    .floatField('humidity', data.measure[2].value)
    .floatField('luminosity', data.measure[3].value)
    .floatField('wind_heading', data.measure[4].value)
    .floatField('wind_speed_avg', data.measure[5].value)
    .floatField('lat', dataGPS.loc.geojson.coordinates[0])
    .floatField('lon', dataGPS.loc.geojson.coordinates[1])
    .stringField('date_location', dataGPS.datetime.toJSON())
    .stringField('date_lastrain', dataRain)
    .stringField('date_measure', `${data.date}`)
    .timestamp(new Date(data.date))

  writeClient.writePoint(point)
  writeClient.flush()
  console.log("success")

  let queryClient = client.getQueryApi(org)
  let fluxQuery = `from(bucket: "weather_data")
  |> range(start: -30d)
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

  setTimeout(writeFileToDB,30000)

}

writeFileToDB()
