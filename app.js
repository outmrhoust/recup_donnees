/* This is importing the modules that we need to use in our project. */
const fs = require("fs");
const nmea = require('@drivetech/node-nmea')
const {InfluxDB, Point} = require('@influxdata/influxdb-client')


const token = process.env.INFLUXDB_TOKEN
const url = 'http://localhost:8086'



let org = `test`
let bucket = `new_test`
const client = new InfluxDB({url, token})
const  writeClient = client.getWriteApi(org, bucket, 'ns')


function writeFileToDB () {


  const data = JSON.parse(fs.readFileSync('./data/sensors', 'utf8'))
  const dataGPS = nmea.parse(fs.readFileSync('./data/gpsNmea', 'utf8').split('\n')[1])
  const dataRain = fs.readFileSync('./data/rainCounter.log', 'utf8').split('\n')[0]
  console.log(data.date)

  const point = new Point('weather')
    .tag('station', "piensg031")
    .floatField('temperature', data.measure[0].value)
    .floatField('pressure', data.measure[1].value)
    .floatField('humidity', data.measure[2].value)
    .floatField('luminosity', data.measure[3].value)
    .floatField('wind_heading', data.measure[4].value)
    .floatField('wind_speed_avg', data.measure[5].value)
    .floatField('wind_speed_max', data.measure[6].value)
    .floatField('wind_speed_min', data.measure[7].value)
    .floatField('lat', dataGPS.loc.geojson.coordinates[0])
    .floatField('lon', dataGPS.loc.geojson.coordinates[1])
    .stringField('date_location', dataGPS.datetime.toJSON())
    .stringField('date_lastrain', dataRain)
    .timestamp(new Date(data.date))

  writeClient.writePoint(point)
  writeClient.flush()
  console.log("success")

  let queryClient = client.getQueryApi(org)
  let fluxQuery = `from(bucket: "new_test")
  |> range(start: -30d)
  |> last()
  |> filter(fn: (r) => r._measurement == "weather")
  |> filter(fn: (r) => r._field == "date_lastrain")
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
