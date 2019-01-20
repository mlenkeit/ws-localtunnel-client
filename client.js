'use strict'

const assert = require('assert')
const request = require('request')

const WebSocketClient = require('websocket').client

module.exports = function ({ apiToken, ltOrigin, destinationOrigin, realm }) {
  assert(apiToken, 'API token option is required')
  assert(ltOrigin, 'ltOrigin option is required')
  assert(destinationOrigin, 'destinationOrigin option is required')
  assert(realm, 'realm option is required')

  const client = new WebSocketClient()

  client.on('connectFailed', function (error) {
    console.error('Failed to connect:', error.toString())
  })

  client.on('connect', function (connection) {
    console.log(`Connected to ${ltOrigin}, listening to realm ${realm}`)

    connection.on('error', function (error) {
      console.error('Connection error:', error.toString())
    })

    connection.on('close', function () {
      console.log('Connection was closed')
    })

    connection.on('message', function (message) {
      console.log('message', message)
      if (message.type !== 'utf8') {
        console.error(`Ignoring message of type ${message.type}`)
      }

      const reqMetadata = JSON.parse(message.utf8Data)
      const uuid = reqMetadata.uuid
      const uri = `${destinationOrigin}${reqMetadata.url}`
      console.log(`Forwarding request to ${uri}`)
      request({
        method: reqMetadata.method,
        uri: uri,
        json: reqMetadata.body
        //, headers: reqMetadata.headers
      }, function (err, res, body) {
        if (err) {
          connection.sendUTF(JSON.stringify({
            uuid: uuid,
            statusCode: 504,
            headers: {},
            body: err.toString()
          }))
          return console.error(`Received error ${err.toString()}`)
        }
        connection.sendUTF(JSON.stringify({
          uuid: uuid,
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        }))
      })
    })

    const ping = function () {
      if (connection.connected) {
        connection.sendUTF('ping')
        setTimeout(ping, 1000)
      }
    }
    ping()
  })

  client.connect(`${ltOrigin}/receive/${realm}`, 'echo-protocol', null, {
    'Authorization': `token ${apiToken}`
  })

  return client
}
