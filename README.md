# jrf-ws-3

![jrf-ws-3](jrfwslogo.png)

## Description

**jrf-ws-3** - is a JavaScript library, to create a real time API
, based on WebSockets. Is a wrapper over a light and fast. [ws](https://github.com/websockets/ws).

It consists of a server part, which runs in the [node.js](https://nodejs.org/en/). 
And the client part, which can be run in the [node.js](https://nodejs.org/en/) and in a web browser.

Messages support routing on server and client. You can send a message in one of 3 options:

- Send the message asynchronously, without waiting for a reply
- Send the message asynchronously, waiting for a reply to the callback
- Send a message asynchronously, waiting for a response in synchronous style

It is possible to send group messages.

The horizontal scaling of the server part is supported.

You can assign addresses of several servers to a client. When the connection is broken,
the client will try to connect to servers using the Round-robin algorithm.

To optimize the work, the library's internal mechanisms, use caching
and asynchronous parallel iteration processing.

- [Client](https://github.com/jirufik/jrf-ws/blob/master/docs/en/client.md)
- [Server](https://github.com/jirufik/jrf-ws/blob/master/docs/en/server.md)
- [Horizontal scaling](https://github.com/jirufik/jrf-ws/blob/master/docs/en/horizontalScaling.md)
- [Class Clones](https://github.com/jirufik/jrf-ws/blob/master/docs/en/clones.md)
- [Class Groups](https://github.com/jirufik/jrf-ws/blob/master/docs/en/groups.md)
- [Class Group](https://github.com/jirufik/jrf-ws/blob/master/docs/en/group.md)

[ru docs](https://github.com/jirufik/jrf-ws/blob/master/README_RU.md)

## Get started

### Server

```js
const jrfWS = require('jrf-ws-3');

// Create an instance of the server
const server = new jrfWS.Server({
  id: 'server',
  port: 4000
});

// Add a handler to the server startup event
server.on('start', ({server}) => {
  console.log(`Server is running on port: ${server.port}`);
});

// Routing

// Add processing of all incoming messages
server.addRoute({
  handler: async ({ws, data, mes, stop}) => {

    // @param {Object}   ws   - Client connection object (class WS)
    // @param {*}        data - message data
    // @param {function} stop - Synchronous function whose execution stops further routing

    console.log(`Processing all incoming messages on the server. route: ${mes.route}, act: ${mes.act}, data: ${JSON.stringify(data)}`);

    // Send an echo message to the route 'echo' to the client from which the message was received
    await ws.sendMes({route: 'echo', data});

  }
});

// Add processing of messages with 'add' action on the 'math' route
// @param {string} route - Route
// @param {string} act   - Action on the route
server.addRoute({

  route: 'math',
  act: 'add',

  handler: ({ws, route, act, data}) => {
    const a = data.a;
    const b = data.b;
    return a + b;
  }

});

server.start();
```  

### Client

```js
const jrfWS = require('jrf-ws-3');

// Create an instance of the client
const client = new jrfWS.Client({
id: 'client',
url: 'ws://localhost:4000'
});

// Let's add processing of the 'echo' route
client.addRoute({
route: 'echo',
handler: ({ws, data, stop}) => {

  // Print echo reply
  console.log(`echo data: ${JSON.stringify(data)}`);

  // Stop further routing
  stop();

}
});

// The client sends messages to the server
const sendMessages = async () => {

// Send the message asynchronously, without waiting for a reply
await client.sendMes({data: {description: 'test message'}});
// server console.log -> `Processing all incoming messages on the server. route: undefined, act: undefined, data: {description: 'test message'}`
// client console.log -> `echo data: {description: 'test message'}`


// Send the message asynchronously, waiting for a response in synchronous style
const res = await client.sendMes({
  route: 'math',
  act: 'add',
  data: {a: 1, b: 2},
  awaitRes: true
});
// server console.log -> `Processing all incoming messages on the server. route: 'math', act: 'add', data: {a: 1, b: 2}`
// client console.log -> `echo data: {a: 1, b: 2}`
console.log(res) // -> 3


// Send the message asynchronously, waiting for a response in callback
const cbAfterRes = ({error, res}) => {
  console.log(res); // -> 8
};

await client.sendMes({
  route: 'math',
  act: 'add',
  data: {a: 5, b: 3},
  cbAfterRes
});
// server console.log -> `Processing all incoming messages on the server. route: 'math', act: 'add', data: {a: 5, b: 3}`
// client console.log -> `echo data: {a: 5, b: 3}`

};

// Add a handler to the event when a connection is opened between the server and the client
client.on('open', () => Promise.resolve().then(sendMessages));

client.start();
```
