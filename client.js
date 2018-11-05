'use strict'

const assert = require('assert')
const request = require('request')

const WebSocketClient = require('websocket').client

module.exports = function (opts) {
  assert(opts.api_token, 'API token option is required')
  assert(opts.host, 'host option is required')
  assert(opts.port, 'port option is required')
  assert(opts.realm, 'realm option is required')

  const client = new WebSocketClient()

  client.on('connectFailed', function (error) {
    console.error('Failed to connect:', error.toString())
  })

  client.on('connect', function (connection) {
    console.log(`Connected to ${opts.host}, listening to realm ${opts.realm}`)

    connection.on('error', function (error) {
      console.error('Connection error:', error.toString())
    })

    connection.on('close', function () {
      console.log('Connection was closed')
    })

    connection.on('message', function (message) {
      if (message.type !== 'utf8') {
        console.error(`Ignoring message of type ${message.type}`)
      }

      const reqMetadata = JSON.parse(message.utf8Data)
      const uuid = reqMetadata.uuid
      request({
        method: reqMetadata.method,
        uri: `http://localhost:${opts.port}${reqMetadata.url}`,
        headers: reqMetadata.headers
      }, function (err, res, body) {
        if (err) {
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

  client.connect(`wss://${opts.host}/receive/${opts.realm}`, 'echo-protocol', null, {
    'Authorization': `token ${opts.api_token}`
  })

  return client
}
