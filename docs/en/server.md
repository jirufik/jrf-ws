## Server

- [Server Initialization](#Server-Initialization)
- [Server Properties](#Server-Properties)
- [Events](#Events)
- [Server start](#Server-start)
- [Server stop](#Server-stop)
- [Middlewares](#Middlewares)
- [Routing](#Routing)
- [Clients](#Clients)

The server manages client connections, supports message routing, group 
mailing, manages group mailing, and supports horizontal scaling.

The server can send a message to a client in one of 3 ways:

- Send the message asynchronously, without waiting for a reply
- Send the message asynchronously, waiting for a reply to the callback
- Send a message asynchronously, waiting for a response in synchronous style

When scaling horizontally, clones (server copies) are used. Clones send group 
messages to each other and their clients, so the clients of all clones 
receive the group message. Clones exchange information about clones they 
know with other clones. This is how communication channels between clones 
are built, even if the clones did not initially know about each other.  

To work with `WebSockets`, the server uses light and fast [ws](https://github.com/websockets/ws).

### Server Initialization

```js
  const jrfWS = require('jrf-ws-3');
  const https = require('https');
  const fs = require('fs');

  // Create an instance of the server/clone
  const server = new jrfWS.Server({
    id: 'server', 
    port: 4000
  });
 
  server.start();

  // Create a server/clone instance with a secure connection
  const cloneParams = {
    id: 'clone',
    port: 4001,
  };

  const clone = new jrfWS.Server(cloneParams);

  const serverHttps = https.createServer({
    cert: fs.readFileSync(`${process.cwd()}/tests/keys/cert.pem`),
    key: fs.readFileSync(`${process.cwd()}/tests/keys/key.pem`)
  });

  serverHttps.listen(4001);
  clone.start({server: serverHttps});
```  

The constructor contains parameters, all parameters are optional except `url`:

| name | type | default | description |
| --- | --- | --- | --- |
| id | string | generate | server id. By default it is generated automatically. But if horizontal scaling is used, it is better to specify it explicitly. the id of each clone should be unique |  
| port | number | 3000 | The port on which the server will accept connections |
| url | string |  | Address of the current clone. If the address is given, it will be transmitted when connecting to the remote clone. The remote clone will try to connect to this address. |
| data | * |  | Any user data |
| authFnIn | function |  | Synchronous or asynchronous function to authenticate incoming connections from clones. It is used when a clone connection event occurs. Accepts the `authValue` parameter from the connecting clone at the input. This value can be anything, like a token or api key. If it returns `false`, the connection is broken. If it returns `true` - the connection is allowed to the clone. |
| authFnOut | function |  | Synchronous or asynchronous function to authenticate outgoing connections to clones. It is used when a connection event occurs to a clone. Accepts the object of the clone client (client) to which it connects at the input. It shall return `authValue`. At this value, the clone will authenticate. This value can be anything, such as a token or api key. |

### Server Properties

| name | type | description |
| --- | --- | --- |
| wss | Object | The object of the server of the `ws` package working with `websocket`. |
| id | string | server id. By default it is generated automatically. But if horizontal scaling is used, it is better to specify it explicitly. the id of each clone should be unique |  
| port | number | Порт, на котором сервер будет принимать соединения |
| url | string | Address of the current clone. If the address is given, it will be transmitted when connecting to the remote clone. The remote clone will try to connect to this address. |
| data | * | Any user data |
| authFnIn | function | Synchronous or asynchronous function to authenticate incoming connections from clones. It is used when a clone connection event occurs. Accepts the `authValue` parameter from the connecting clone at the input. This value can be anything, like a token or api key. If it returns `false`, the connection is broken. If it returns `true` - the connection is allowed to the clone. |
| authFnOut | function | Synchronous or asynchronous function to authenticate outgoing connections to clones. It is used when a connection event occurs to a clone. Accepts the object of the clone client (client) to which it connects at the input. It shall return `authValue'. At this value, the clone will authenticate. This value can be anything, such as a token or api key. |
| active | boolean | Server status. `true` - started, `false` - stopped. |
| routes | Set | Routes that pass, client messages. `class Route` |
| groups | Object | Group Manager `class Groups` |
| clients | Object | Client connections: Key - id of client connection from the server side (generated automatically); Value - client connection object `class WS`. |
| clones | Object | Clone Manager `class Clones` |

### Events

Example of subscription to the event `error`

```js
server.on('error', ({server, error}) => console.error(error));
```

#### start 

Happens at the moment of server start

Options:

| name | type | description |
| --- | --- | --- |
| server | Object | Server `class Server` | 

#### connection

Occurs when the client creates a `socket` connection

Options:

| name | type | description |
| --- | --- | --- |
| server | Object | Server `class Server` | 

#### stop

Occurs when the server stops

Options:

| name | type | description |
| --- | --- | --- |
| server | Object | Server `class Server` |

#### close

Occurs at the moment when the `socket` connection is closed.

Options:

| name | type | description |
| --- | --- | --- |
| server | Object | Server `class Server` |

#### closeClient

Occurs at the moment when the client's `socket` connection is closed.

Options:

| name | type | description |
| --- | --- | --- |
| server | Object | Server `class Server` |
| client | Object | Client connection object `class WS` |

#### error

Happens at the moment of the error

Options:

| name | type | description |
| --- | --- | --- |
| server | Object | Server `class Server` |
| error | Object | Error |

#### noRouting

Occurs if the message has not passed on any of the routes

Options:

| name | type | description |
| --- | --- | --- |
| server | Object | Server `class Server` |
| ws | Object | Client connection object `class WS` |
| groups | Object | Group Manager `class Groups` |
| data | * | Message data |
| mes | Object | User message `route`, `act`, `data` |
| raw | Object | Complete message containing user message (mes) and system information |

#### auth

Happens when the remote clone successfully authenticates

Options:

| name | type | description |
| --- | --- | --- |
| server | Object | Server `class Server` |
| clone | Object | Client connection object, remote `class WS` clone. |

#### authError

Occurs when a remote clone fails to authenticate

Options:

| name | type | description |
| --- | --- | --- |
| server | Object | Server `class Server` |
| clone | Object | Client connection object, remote clone `class WS` |

### Server start

Starting the server produces a `start` method that accepts optional parameters:

| name | type | description |
| --- | --- | --- |
| opts | Object | Package server options object [ws](https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback) |

When the server is started successfully, it switches to the active state `active = true;`.
A clone manager is started which exchanges information with other clones.

### Server stop

Server stoppage is performed by the `stop` method, which accepts optional parameters:

| name | type | description |
| --- | --- | --- |
| cb | function | Callback function, will call after stopping the server |

The server goes to the inactive state `active = false;`.
The clone manager that communicates with other clones is stopped.

### Middlewares

Every incoming message passes through the following before being routed
`middlewares`.

`Middleware` is added with the `use` method which takes a synchronous or 
asynchronous function `fn`.

The `fn` function accepts parameters:

| name | type | description |
| --- | --- | --- |
| ws | Object | Client that sent a message, client connection object `class WS`. |
| groups | Object | Group Manager `class Groups` |
| mes | Object | Incoming client message, contains: `route`, `act`, `data` |
| stop | function | Synchronous function whose execution stops further routing |
| raw | Object | Complete message containing user message (mes) and system information |

```js
  server.use(({ws, groups, mes, stop, raw}) => {

    const login = mes.route === 'login';
    const token = ws.userData.token;
    if (token || login) return;

    stop();
    return {error: 'bad token'};

  });
```

### Routing

To add a route, the `addRoute` method is used.

The method accepts parameters:

| name | type | description |
| --- | --- | --- |
| groups | Object | Group Manager `class Groups` |
| route | string | Route |
| act | string | Action on the route |
| handler | function | Mandatory parameter. Synchronous or asynchronous function, handler of incoming message that falls under routing |

The `handler` handler accepts parameters:

| name | type | description |
| --- | --- | --- |
| ws | Object | Client that sent a message, client connection object `class WS`. |
| groups | Object | Group Manager `class Groups` |
| data | * | Message data |
| mes | Object | Incoming client message, contains: `route`, `act`, `data` |
| stop | function | Synchronous function whose execution stops further routing |
| raw | Object | Complete message containing user message (mes) and system information |

Examples: 

```js
  // The handler will pass all messages
  server.addRoute({
    handler: ({ws, groups, data, mes, stop, raw}) => {
      console.log(`all messages`);
    }
  });

  // The handler will process messages containing 
  // route === 'login' and containing or not containing act
  server.addRoute({
    route: 'login',
    handler: async ({ws, groups, data, mes, stop, raw}) => {

      const login = data.user.login;
      const password = data.user.password;

      const token = await auth({login, password});
      if (!token) {
        stop();
        return;
      }

      ws.userData = {token};

    }
  });

  // The handler will process messages containing 
  // route === 'users' and containing or not containing an act
  server.addRoute({
    route: 'users',
    handler: ({ws, groups, data, mes, stop, raw}) => {
      console.log(`users messages`);
    }
  });

  // The handler will process messages containing 
  // route === 'users' and containing the act === 'add'
  server.addRoute({
    route: 'users',
    act: 'add',
    handler: ({ws, groups, data, mes, stop, raw}) => {
      console.log(`add users messages`);
    }
  });
``` 

### Clients

Client connections are stored in the `clients` property. Key - `id` of 
client connection from the server side (generated automatically). Value - 
object of client connection `class WS`. The client connection is also 
available in `middlewares` and `handler` routing, as a parameter `ws`.

You can send a message to each client by calling the asynchronous method 
`asyn sendMes`. Accepts parameters:

| name | type | description |
| --- | --- | --- |
| route | string | Route |
| act | string | Action on the path |
| data | * | Data to be sent |
| opts | Object | Package Options [ws](https://github.com/websockets/ws/blob/master/doc/ws.md#websocketsenddata-options-callback) |
| cbAfterSend | function | `callback` which will be executed after the message is sent, the package [ws](https://github.com/websockets/ws/blob/master/doc/ws.md#websocketsenddata-options-callback) |
| cbAfterRes | function | `callback` which will be executed when the reply to the sent message is returned. |
| awaitRes | boolean | Waiting for asynchronous response in synchronous style. Default is `false`. |
| timeout | number | Time (ms) of waiting for the answer, after which an exception will be invoked. Default is `10000`. |

Examples:

```js
// The handler will pass all messages
server.addRoute({
  handler: async ({ws, groups, data, mes, stop, raw}) => {

    // Send the message asynchronously, without waiting for a reply
    await ws.sendMes({data: {description: 'test message'}});

    // Send the message asynchronously, waiting for a response in synchronous style
    const res = await ws.sendMes({
      route: 'math',
      act: 'add',
      data: {a: 1, b: 2},
      awaitRes: true
    });

    // Send the message asynchronously, waiting for a response in callback
    const cbAfterRes = ({error, res}) => {
      console.log(res);
    };

    await ws.sendMes({
      route: 'math',
      act: 'add',
      data: {a: 5, b: 3},
      cbAfterRes
    });

  }
});
```
