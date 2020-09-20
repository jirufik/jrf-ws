// Backend client, with 'ws' npm package
const WebSocket = require('ws');
const client = require('./client');
module.exports = client({WebSocket});