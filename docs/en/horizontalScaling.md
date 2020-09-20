## Horizontal scaling

- [Adding a remote clone](#Adding-a-remote-clone)
- [Removal of the remote clone](#Removal-of-the-remote-clone)
- [Updating the outbound connection authentication function](#Updating-the-outbound-connection-authentication-function)
- [Example](#Example)

Horizontal scaling is achieved by creating **Clones** copies of servers. 
Clones exchange information with each other. Each clone provides other clones
with information about clones it knows. This way the network is automatically
built. The clones communicate with each other in system messages. 

If the client sends a group message or the clone itself initiates a group 
message, then such a message is sent to the clients of the given clone, and 
to all known remote clones. Having received such a message, remote clones 
send their clients and remote clones which have not yet sent a message.

If a group is deleted on one of the clones, a system message is sent to the 
deleted clones telling them to delete the group. A remote clone sends a 
message to other remote clones that were not on the system message 
recipient list.

Clones support authentication. By default, a clone can connect to any remote
clone without authentication. But if a clone is set to `authFnIn` authentication
function, it will check every remote clone when trying to connect.
The function can be synchronous or asynchronous, it accepts the `authValue` 
parameter at the input, this is the value that the remote clone provides as 
authentication. This value can be anything like `token' or `api key'. 
If the remote clone does not pass the check then the `false` must be 
returned and the connection of the remote clone is broken. If the function 
returns `true`, the connection to the remote clone is established.

You should set the `authFnOut` function if the remote clones 
require authentication. The function can be synchronous or asynchronous. 
It must return the value that the remote clone will use during the 
authentication process. This value can be anything like `token` or `api key`.

### Adding a remote clone

The `addClone` method is used to add a clone. When adding a remote clone, 
the clone will try to connect to the remote clone if it is active. When 
connecting, the clone will transmit data about clones known to it. It will 
also pass information about itself, if set to `url`. 

| name | type | description |
| --- | --- | --- |
| id | string | `id` remote clone. The same address, on all clones, must have the same `id`. If the address is the same and the `id is different, the clone will duplicate and will start receiving messages several times. |
| url | string | connection address for a clone |
| authFnOut | function | Synchronous or asynchronous function to authenticate outgoing connections to clones. It is used when a connection event occurs to a clone. Accepts the object of the clone client (client) to which it connects at the input. It shall return `authValue'. At this value, the remote clone will authenticate. This value can be anything, like a token or api key. |

### Removal of the remote clone

The `deleteClone` method is used to remove the clone.

| name | type | description |
| --- | --- | --- |
| id | string | `id` remote clone |

### Updating the outbound connection authentication function

The `updateAuthFnOut` method is used to update the `authFnOut` function for 
authentication of outgoing connections. The method stops the connection to 
all remote clones, updates the `authFnOut` function of each clone and 
restarts the connection.

### Example
```js
  const jrfWS = require('jrf-ws');

  // Function return values for authentication
  // when connecting to remote clones
  // Send token
  const authFnOut = () => 'token';

  // Connection Authentication Function
  // deleted clones to the current one
  // Let's check the token
  const authFnIn = (authValue) => {
    return authValue === 'token';
  };

  // Initialize clones
  const clone1 = new jrfWS.Server({
    id: 'clone1',
    port: 4001,
    // If we know the address, we will prescribe it, 
    // so when connecting to a remote clone, 
    // the clone will declare itself
    url: 'ws://localhost:4001',
    authFnOut,
    authFnIn
  });

  const clone2 = new jrfWS.Server({
    id: 'clone2',
    port: 4002,
    url: 'ws://localhost:4002',
    authFnOut,
    authFnIn
  });

  const clone3 = new jrfWS.Server({
    id: 'clone3',
    port: 4003,
    url: 'ws://localhost:4003',
    authFnOut,
    authFnIn
  });

  const clone4 = new jrfWS.Server({
    id: 'clone4',
    port: 4004,
    url: 'ws://localhost:4004',
    authFnOut,
    authFnIn
  });

  // Run the clones
  clone1.start();
  clone2.start();
  clone3.start();
  clone4.start();

  // Let's tell clone1 about clone2 and clone4
  clone1.addClone({id: 'clone2', url: 'ws://localhost:4002'});
  clone1.addClone({id: 'clone4', url: 'ws://localhost:4004'});

  // By default, clones are exchanged every 2 seconds.
  // so we will pause for 4 seconds
  await wait(4000);

  // clone1, clone2, clone4 now know everything about each other,
  // although only clone1 added them.
  console.log(clone1.clones.clones.keys()); // [Map Iterator] { 'clone2', 'clone4' }
  console.log(clone2.clones.clones.keys()); // [Map Iterator] { 'clone4', 'clone1' }
  console.log(clone3.clones.clones.keys()); // [Map Iterator] {  }
  console.log(clone4.clones.clones.keys()); // [Map Iterator] { 'clone2', 'clone1' }

  // To make clone3 aware of all remote clones
  // and for remote clones to learn about it
  // just connect one of the remote clones
  clone3.addClone({id: 'clone4', url: 'ws://localhost:4004'});

  await wait(4000);

  console.log(clone1.clones.clones.keys()); // [Map Iterator] { 'clone2', 'clone4', 'clone3' }
  console.log(clone2.clones.clones.keys()); // [Map Iterator] { 'clone4', 'clone1', 'clone3' }
  console.log(clone3.clones.clones.keys()); // [Map Iterator] { 'clone4', 'clone1', 'clone2' }
  console.log(clone4.clones.clones.keys()); // [Map Iterator] { 'clone2', 'clone1', 'clone3' }

  // Stop clones
  clone1.stop();
  clone2.stop();
  clone3.stop();
  clone4.stop();
```