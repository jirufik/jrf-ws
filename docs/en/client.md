## Client

- [Client initialization](#client-initialization)
- [Events](#Events)
- [Client start](#Client-start)
- [Client stop](#Client-stop)
- [Client Information](#Client-Information)
- [Add clone (server) address](#Add-clone-address)
- [Delete clone (server) address](#Delete-clone-address)
- [Set the following clone (server) address](#Set-the-following-clone-address)
- [Subscribe to a group](#Subscribe-to-a-group)
- [Unsubscribe from group messages](#Unsubscribe-from-group-messages)
- [Get the list of groups](#Get-the-list-of-groups)
- [Middlewares](#Middlewares)
- [Routing](#Routing)
- [Send a message to the server](#Send-a-message-to-the-server)
- [Send group message](#Send-group-message)

The client supports message routing and group mailing, subscription to group mailings.

You can send a message in one of 3 options:

- Send the message asynchronously, without waiting for a reply
- Send the message asynchronously, waiting for a reply to the callback
- Send a message asynchronously, waiting for a response in synchronous style

You can specify addresses for several clones (servers). When the connection is broken, 
the client will try to connect to clones (servers) using the Round-robin algorithm.

No sticky sessions are required for the client to work with clones.

The client has two implementations:

- Web implementation, based on [WebScoket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- Node.js implementation, based on [ws](https://github.com/websockets/ws)

The implementations have almost identical functionality, the differences are not significant.

### client initialization

Web client

```js
import jrfWS from 'jrf-ws';

// Create an instance of the client
const client = new jrfWS.WebClient({
id: 'client',
url: 'ws://localhost:4000'
});
```  

Node.js client

```js
const jrfWS = require('jrf-ws');

// Create an instance of the client
const client = new jrfWS.Client({
id: 'client',
url: 'ws://localhost:4000'
});
```  

The constructor contains parameters, all parameters are optional except `url`:

| name | type | default | description |
| --- | --- | --- | --- | 
| id | string | generate | client id. If not specified, it is generated automatically. |
| url | string/Array |  | Server address `'ws://localhost:3000'`. You can specify an array of addresses for clones `['ws://remote1:3000'', 'wss://remote2:4000']`. If a connection is broken, the client will try to connect to the next clone by (round-robin) |
| data | Object | {} | Any user data |
| reconnect | boolean | true | Connect when the connection is broken |
| reconnectTimeout | number | 2000 | The pause between reconnection attempts |
| awaitResTimeout | number | 10000 | Time of waiting for a reply to a sent message. For synchronous style or callback function. |
| awaitCycleTimeout | number | 15 | Asynchronous pause between iterations of checking the response to the message. |
| attempts | number | 0 | Number of reconnection attempts, if 0 then the infinite reconnection |
| silent | boolean | true | Do not display error messages in the console |

### Events

Example of subscription to the event `error`

```js
client.on('error', ({client, error}) => console.error(error));
```

#### start 

Happens when the client starts

Options:

| name | type | description |
| --- | --- | --- |
| client | object | Client. `class Client` | 

#### open 

Occurs when the `socket` connection between the client and the clone (server) is installed.

Options:

| name | type | description |
| --- | --- | --- |
| client | object | Client. `class Client` | 

#### stop 

Occurs when the client stops

Options:

| name | type | description |
| --- | --- | --- |
| client | object | Client. `class Client` | 

#### close 

Occurs at the moment when the `socket` connection is closed.

Options:

| name | type | description |
| --- | --- | --- |
| client | object | Client. `class Client` | 

#### reconnect 

Happens at the moment of reconnection

Options:

| name | type | description |
| --- | --- | --- |
| client | object | Client. `class Client` | 

#### error 

Happens at the moment of the error

Options:

| name | type | description |
| --- | --- | --- |
| client | object | Client. `class Client` |
| error | object | Error | 

#### noRouting 

Occurs if the message has not passed on any of the routes

Options:

| name | type | description |
| --- | --- | --- |
| client | object | Client. `class Client` |
| ws | object | Client connection object. `class WS` |
| data | * | Message data |

#### auth 

Occurs at the moment when the clone is authenticated.

Options:

| name | type | description |
| --- | --- | --- |
| client | object | Client. `class Client` |  

#### authError 

Occurs at the moment when the clone has not been authenticated

Options:

| name | type | description |
| --- | --- | --- |
| client | object | Client. `class Client` |
| error | object | Authentication error |

### Client start

The `start` method is used to start the client, which can accept parameters:

| name | type | description |
| --- | --- | --- |
| url | string | Server address `'ws://localhost:3000'`. You can specify an array of addresses for clones `['ws://remote1:3000'', 'wss://remote2:4000']`. If a connection is broken, the client will try to connect to the next clone by (round-robin). If the address(s) is not specified, then the address(s) specified when creating the client instance is used |
| reconnect | boolean | Connect when the connection is broken |
| reconnectTimeout | number | The pause between reconnection attempts |
| attempts | number | Number of reconnection attempts, if 0 then the infinite reconnection |
| opts | Object | Only for Node.js `Client`, package options [ws](https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketaddress-protocols-options) |

### Client stop

To stop, the client uses the `stop' method, which can accept parameters:

| name | type | description |
| --- | --- | --- |
| cb | function | Only for Node.js `Client`. The callback function will be called after the client stops. |

### Client Information

You can get information about the client by calling the `getInfo` method and return it:

| name | type | description |
| --- | --- | --- |
| id | string | client id |
| url | string | Address of the current clone (server) `'ws://remote1:3000'` |
| urls | Array | Clone (server) addresses `['ws://remote1:3000', 'wss://remote2:4000']` |
| timeouts | Object | An object containing timeouts: `reconnectTimeout`, `awaitResTimeout`, `awaitCycleTimeout` |
| attempts | number | Number of reconnection attempts |
| data | Object | Any user data |
| groups | Array | Array of `id` groups to which the client subscribes. |

### Add clone address

To add a clone (server) address, the `addUrl` method is used.

| name | type | description |
| --- | --- | --- |
| url | string/Array | Server address `'ws://localhost:3000'`. You can specify an array of addresses for clones `['ws://remote1:3000'', 'wss://remote2:4000']`. |

### Delete clone address

The `deleteUrl` method is used to delete the clone (server) address(s).

| name | type | description |
| --- | --- | --- |
| url | string | The server address `'ws://localhost:3000'`, which should be deleted, if the address is not specified, all addresses are deleted |

### Set the following clone address

The `nextUrl` method call sets the current connection address to the next server using 
the `round-robin` algorithm, but reconnection does not occur. Returns: 

| name | type | description |
| --- | --- | --- |
| url | string | Address of the current clone (server) |

### Subscribe to a group

You can subscribe to the group messages using the `subscribe` method.
Parameters:

| name | type | description |
| --- | --- | --- |
| id | string | group `id` |

### Unsubscribe from group messages

You can unsubscribe from the group messages by executing the `unsubscribe` method.
Options:

| name | type | description |
| --- | --- | --- |
| id | string | group `id` |

### Get the list of groups

You can get the list of groups to which the client is subscribed by calling 
method `getMyGroups`. Returns an array of `id` groups.

### Middlewares

Every incoming message passes through the following before being routed
`middlewares`.

`Middleware` is added with the `use` method which takes the synchronous or asynchronous function `fn`.

The `fn` function accepts parameters:

| name | type | description |
| --- | --- | --- |
| ws | Object | Client, client connection object `class WS`. |
| mes | Object | Incoming user message, contains: `route', `act', `data'. |
| stop | function | Synchronous function whose execution stops further routing |
| raw | Object | Complete message containing user message (mes) and system information |

```js
  client.use(({ws, mes, stop, raw}) => {

    const token = mes.data.token;
    if (token) return;

    stop();
    return {error: 'bad token'};

  });
```

### Routing

To add a route, the `addRoute` method is used.

The method accepts parameters:

| name | type | description |
| --- | --- | --- |
| route | string | Route |
| act | string | Action on the route |
| handler | function | Mandatory parameter. Synchronous or asynchronous function, handler of incoming message that falls under routing |

The `handler` handler accepts parameters:

| name | type | description |
| --- | --- | --- |
| ws | Object | Client, client connection object `class WS`. |
| data | * | Message data |
| stop | function | Synchronous function whose execution stops further routing |

Examples: 

```js
  // The handler will process all messages
  client.addRoute({
    handler: ({ws, data, stop}) => {
      console.log(`all messages`);
    }
  });

  // The handler will process messages containing 
  // route === 'users' and containing or not containing an act
  client.addRoute({
    route: 'users',
    handler: ({ws, data, stop}) => {
      console.log(`users messages`);
    }
  });

  // The handler will process messages containing 
  // route === 'users' and containing the act === 'add'
  client.addRoute({
    route: 'users',
    act: 'add',
    handler: ({ws, data, stop}) => {
      console.log(`add users messages`);
    }
  });
```

### Send a message to the server

To send a message to the server, an asynchronous method `async sendMes` is executed.
It accepts the parameters:

| name | type | description |
| --- | --- | --- |
| route | string | Route |
| act | string | Action on the route |
| data | * | Data to be sent |
| opts | Object | Only for Node.js `Client`, package options [ws](https://github.com/websockets/ws/blob/master/doc/ws.md#websocketsenddata-options-callback) |
| cbAfterRes | function | `callback` which will be executed when the reply to the sent message is returned. |
| cbAfterSend | function | Only for Node.js `Client`, the callback that will run after the message is sent, the package [ws](https://github.com/websockets/ws/blob/master/doc/ws.md#websocketsenddata-options-callback) |
| awaitRes | boolean | Waiting for asynchronous response in synchronous style. Default is `false`. |
| timeout | number | Time (ms) of waiting for the answer, after which an exception will be invoked. Default is `10000`. |

Examples:

```js
// Send the message asynchronously, without waiting for a reply
await client.sendMes({data: {description: 'test message'}});

// Send the message asynchronously, waiting for a response in synchronous style
const res = await client.sendMes({
  route: 'math',
  act: 'add',
  data: {a: 1, b: 2},
  awaitRes: true
});

// Send the message asynchronously, waiting for a response in callback
const cbAfterRes = ({error, res}) => {
  console.log(res);
};

await client.sendMes({
  route: 'math',
  act: 'add',
  data: {a: 5, b: 3},
  cbAfterRes
});
```

### Send group message

To send a group message, the asynchronous method `async sendMesToGroup` is executed.
It accepts the parameters:

| name | type | description |
| --- | --- | --- |
| id | null/string/Array | group id. If not specified, the message is sent to all groups. If id is specified, the message is sent to the group. If an id array is specified, the message is sent to the specified groups. |
| route | string | Route |
| act | string | Action on the route |
| data | * | Data to be sent |
| notSendMe | boolean | `true` exclude the current client from receiving the message. Default is `false`. |

Examples:

```js
// Send a message to the group of truckers
await client.sendMesToGroup({
    id: 'truckers',
    data: 'hi guys from client'
  });

// Send message to groups of truckers and truckers2
await client.sendMesToGroup({
    id: ['truckers', 'truckers2'],
    data: 'truckers2 is amazing game'
  });

// Send message to all groups
await client.sendMesToGroup({
    data: 'all groups'
  });
```