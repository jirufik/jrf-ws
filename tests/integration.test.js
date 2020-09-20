const jrfWS = require('../index');
const wait = require('../utils/wait');
const pathExists = require('jrf-path-exists');
const https = require('https');
const fs = require('fs');

test('client server connection, start, stop', async (done) => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 4000,
  };

  const server = new jrfWS.Server(srvParams);

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:4000'
  };

  const client = new jrfWS.Client(clnParams);

  const fnOpen = () => {

    expect(client.active).toBeTruthy();
    expect(client.active).toBeTruthy();

    server.stop();
    client.stop();

  };

  const fnStop = () => {

    expect(client.active).toBeTruthy();
    expect(client.active).toBeTruthy();

    done();

  };

  client.on('open', fnOpen);
  client.on('stop', fnStop);

  // Process

  server.start();
  client.start();

});

test('server routing', async () => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 4005,
  };

  const server = new jrfWS.Server(srvParams);

  let noRouteCount = 0;
  let noRouteData = null;
  server.addRoute({
    handler: async ({ws, groups, data, mes, stop, raw}) => {
      noRouteCount++;
      noRouteData = data;
    }
  });

  let routeTruckersCount = 0;
  let routeTruckersData = null;
  server.addRoute({
    route: 'truckers2',
    handler: ({ws, groups, data, mes, stop, raw}) => {
      routeTruckersCount++;
      routeTruckersData = data;
    }
  });

  let routeTruckersActPlayCount = 0;
  let routeTruckersActPlayData = null;
  server.addRoute({
    route: 'truckers2',
    act: 'play',
    handler: ({ws, groups, data, mes, stop, raw}) => {
      routeTruckersActPlayCount++;
      routeTruckersActPlayData = data;
    }
  });

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:4005'
  };

  const client = new jrfWS.Client(clnParams);

  // Process

  server.start();
  client.start();

  await wait(100);

  expect(noRouteCount).toEqual(0);
  expect(noRouteData).toBeNull();

  expect(routeTruckersCount).toEqual(0);
  expect(routeTruckersData).toBeNull();

  expect(routeTruckersActPlayCount).toEqual(0);
  expect(routeTruckersActPlayData).toBeNull();

  await client.sendMes({
    data: 'star',
    awaitRes: true
  });

  expect(noRouteCount).toEqual(1);
  expect(noRouteData).toEqual('star');

  expect(routeTruckersCount).toEqual(0);
  expect(routeTruckersData).toBeNull();

  expect(routeTruckersActPlayCount).toEqual(0);
  expect(routeTruckersActPlayData).toBeNull();

  await client.sendMes({
    route: 'truckers2',
    data: 'moon',
    awaitRes: true
  });

  expect(noRouteCount).toEqual(2);
  expect(noRouteData).toEqual('moon');

  expect(routeTruckersCount).toEqual(1);
  expect(routeTruckersData).toEqual('moon');

  expect(routeTruckersActPlayCount).toEqual(0);
  expect(routeTruckersActPlayData).toBeNull();

  await client.sendMes({
    route: 'truckers2',
    act: 'play',
    data: 'sun',
    awaitRes: true
  });

  expect(noRouteCount).toEqual(3);
  expect(noRouteData).toEqual('sun');

  expect(routeTruckersCount).toEqual(2);
  expect(routeTruckersData).toEqual('sun');

  expect(routeTruckersActPlayCount).toEqual(1);
  expect(routeTruckersActPlayData).toEqual('sun');

  client.stop();
  server.stop();

});

test('client routing', async () => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 4006,
  };

  const server = new jrfWS.Server(srvParams);

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:4006'
  };

  const client = new jrfWS.Client(clnParams);

  let noRouteCount = 0;
  let noRouteData = null;
  client.addRoute({
    handler: async ({ws, data, stop}) => {
      noRouteCount++;
      noRouteData = data;
    }
  });

  let routeTruckersCount = 0;
  let routeTruckersData = null;
  client.addRoute({
    route: 'truckers2',
    handler: ({ws, data, stop}) => {
      routeTruckersCount++;
      routeTruckersData = data;
    }
  });

  let routeTruckersActPlayCount = 0;
  let routeTruckersActPlayData = null;
  client.addRoute({
    route: 'truckers2',
    act: 'play',
    handler: ({ws, data, stop}) => {
      routeTruckersActPlayCount++;
      routeTruckersActPlayData = data;
    }
  });

  // Process

  server.start();
  client.start();

  await wait(100);

  expect(noRouteCount).toEqual(0);
  expect(noRouteData).toBeNull();

  expect(routeTruckersCount).toEqual(0);
  expect(routeTruckersData).toBeNull();

  expect(routeTruckersActPlayCount).toEqual(0);
  expect(routeTruckersActPlayData).toBeNull();

  const srvClient = Object.values(server.clients)[0];

  await srvClient.sendMes({
    data: 'star',
    awaitRes: true
  });

  expect(noRouteCount).toEqual(1);
  expect(noRouteData).toEqual('star');

  expect(routeTruckersCount).toEqual(0);
  expect(routeTruckersData).toBeNull();

  expect(routeTruckersActPlayCount).toEqual(0);
  expect(routeTruckersActPlayData).toBeNull();

  await srvClient.sendMes({
    route: 'truckers2',
    data: 'moon',
    awaitRes: true
  });

  expect(noRouteCount).toEqual(2);
  expect(noRouteData).toEqual('moon');

  expect(routeTruckersCount).toEqual(1);
  expect(routeTruckersData).toEqual('moon');

  expect(routeTruckersActPlayCount).toEqual(0);
  expect(routeTruckersActPlayData).toBeNull();

  await srvClient.sendMes({
    route: 'truckers2',
    act: 'play',
    data: 'sun',
    awaitRes: true
  });

  expect(noRouteCount).toEqual(3);
  expect(noRouteData).toEqual('sun');

  expect(routeTruckersCount).toEqual(2);
  expect(routeTruckersData).toEqual('sun');

  expect(routeTruckersActPlayCount).toEqual(1);
  expect(routeTruckersActPlayData).toEqual('sun');

  client.stop();
  server.stop();

});

test('server middlewares', async () => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 4007,
  };

  const server = new jrfWS.Server(srvParams);

  let tokenMiddlewareCount = 0;
  server.use(({ws, groups, mes, stop, raw}) => {

    tokenMiddlewareCount++;

    const token = pathExists(mes, 'data.token');
    if (token) return;

    stop();
    return {error: 'bad token'};

  });

  let routeCount = 0;
  let routeData = null;
  server.addRoute({
    route: 'before middlewares',
    handler: async ({ws, groups, data, mes, stop, raw}) => {
      routeCount++;
      routeData = data;
    }
  });

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:4007',
    awaitResTimeout: 50
  };

  const client = new jrfWS.Client(clnParams);

  // Process

  server.start();
  client.start();

  await wait(100);

  expect(tokenMiddlewareCount).toEqual(0);
  expect(routeCount).toEqual(0);
  expect(routeData).toBeNull();

  const res = await client.sendMes({
    route: 'before middlewares',
    data: {},
    awaitRes: true
  });

  expect(tokenMiddlewareCount).toEqual(1);
  expect(routeCount).toEqual(0);
  expect(routeData).toBeNull();
  expect(res).toMatchObject({error: 'bad token'});

  await client.sendMes({
    route: 'before middlewares',
    data: {token: 'hello bro'},
    awaitRes: true
  });

  expect(tokenMiddlewareCount).toEqual(2);
  expect(routeCount).toEqual(1);
  expect(routeData).toMatchObject({token: 'hello bro'});

  client.stop();
  server.stop();

});

test('client middlewares', async () => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 4008,
  };

  const server = new jrfWS.Server(srvParams);

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:4008',
    awaitResTimeout: 50
  };

  const client = new jrfWS.Client(clnParams);

  let tokenMiddlewareCount = 0;
  client.use(({ws, mes, stop, raw}) => {

    tokenMiddlewareCount++;

    const token = pathExists(mes, 'data.token');
    if (token) return;

    stop();
    return {error: 'bad token'};

  });

  let routeCount = 0;
  let routeData = null;
  client.addRoute({
    route: 'before middlewares',
    handler: async ({ws, data, stop}) => {
      routeCount++;
      routeData = data;
    }
  });

  // Process

  server.start();
  client.start();

  await wait(100);

  expect(tokenMiddlewareCount).toEqual(0);
  expect(routeCount).toEqual(0);
  expect(routeData).toBeNull();

  const srvClient = Object.values(server.clients)[0];

  const res = await srvClient.sendMes({
    route: 'before middlewares',
    data: {},
    awaitRes: true
  });

  expect(tokenMiddlewareCount).toEqual(1);
  expect(routeCount).toEqual(0);
  expect(routeData).toBeNull();
  expect(res).toMatchObject({error: 'bad token'});

  await srvClient.sendMes({
    route: 'before middlewares',
    data: {token: 'hello bro'},
    awaitRes: true
  });

  expect(tokenMiddlewareCount).toEqual(2);
  expect(routeCount).toEqual(1);
  expect(routeData).toMatchObject({token: 'hello bro'});

  client.stop();
  server.stop();

});

test('server stop routing', async () => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 4009,
  };

  const server = new jrfWS.Server(srvParams);

  let noRouteCount = 0;
  let noRouteData = null;
  server.addRoute({
    handler: async ({ws, groups, data, mes, stop, raw}) => {
      noRouteCount++;
      noRouteData = data;
      stop();
    }
  });

  let routeTruckersCount = 0;
  let routeTruckersData = null;
  server.addRoute({
    route: 'truckers2',
    handler: ({ws, groups, data, mes, stop, raw}) => {
      routeTruckersCount++;
      routeTruckersData = data;
    }
  });

  let routeTruckersActPlayCount = 0;
  let routeTruckersActPlayData = null;
  server.addRoute({
    route: 'truckers2',
    act: 'play',
    handler: ({ws, groups, data, mes, stop, raw}) => {
      routeTruckersActPlayCount++;
      routeTruckersActPlayData = data;
    }
  });

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:4009'
  };

  const client = new jrfWS.Client(clnParams);

  // Process

  server.start();
  client.start();

  await wait(100);

  expect(noRouteCount).toEqual(0);
  expect(noRouteData).toBeNull();

  expect(routeTruckersCount).toEqual(0);
  expect(routeTruckersData).toBeNull();

  expect(routeTruckersActPlayCount).toEqual(0);
  expect(routeTruckersActPlayData).toBeNull();

  await client.sendMes({
    data: 'star',
    awaitRes: true
  });

  expect(noRouteCount).toEqual(1);
  expect(noRouteData).toEqual('star');

  expect(routeTruckersCount).toEqual(0);
  expect(routeTruckersData).toBeNull();

  expect(routeTruckersActPlayCount).toEqual(0);
  expect(routeTruckersActPlayData).toBeNull();

  await client.sendMes({
    route: 'truckers2',
    data: 'moon',
    awaitRes: true
  });

  expect(noRouteCount).toEqual(2);
  expect(noRouteData).toEqual('moon');

  expect(routeTruckersCount).toEqual(0);
  expect(routeTruckersData).toBeNull();

  expect(routeTruckersActPlayCount).toEqual(0);
  expect(routeTruckersActPlayData).toBeNull();

  await client.sendMes({
    route: 'truckers2',
    act: 'play',
    data: 'sun',
    awaitRes: true
  });

  expect(noRouteCount).toEqual(3);
  expect(noRouteData).toEqual('sun');

  expect(routeTruckersCount).toEqual(0);
  expect(routeTruckersData).toBeNull();

  expect(routeTruckersActPlayCount).toEqual(0);
  expect(routeTruckersActPlayData).toBeNull();

  client.stop();
  server.stop();

});

test('client stop routing', async () => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 5000,
  };

  const server = new jrfWS.Server(srvParams);

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:5000'
  };

  const client = new jrfWS.Client(clnParams);

  let noRouteCount = 0;
  let noRouteData = null;
  client.addRoute({
    handler: async ({ws, groups, data, mes, stop, raw}) => {
      noRouteCount++;
      noRouteData = data;
      stop();
    }
  });

  let routeTruckersCount = 0;
  let routeTruckersData = null;
  client.addRoute({
    route: 'truckers2',
    handler: ({ws, groups, data, mes, stop, raw}) => {
      routeTruckersCount++;
      routeTruckersData = data;
    }
  });

  let routeTruckersActPlayCount = 0;
  let routeTruckersActPlayData = null;
  client.addRoute({
    route: 'truckers2',
    act: 'play',
    handler: ({ws, groups, data, mes, stop, raw}) => {
      routeTruckersActPlayCount++;
      routeTruckersActPlayData = data;
    }
  });

  // Process

  server.start();
  client.start();

  await wait(100);

  expect(noRouteCount).toEqual(0);
  expect(noRouteData).toBeNull();

  expect(routeTruckersCount).toEqual(0);
  expect(routeTruckersData).toBeNull();

  expect(routeTruckersActPlayCount).toEqual(0);
  expect(routeTruckersActPlayData).toBeNull();

  const srvClient = Object.values(server.clients)[0];

  await srvClient.sendMes({
    data: 'star',
    awaitRes: true
  });

  expect(noRouteCount).toEqual(1);
  expect(noRouteData).toEqual('star');

  expect(routeTruckersCount).toEqual(0);
  expect(routeTruckersData).toBeNull();

  expect(routeTruckersActPlayCount).toEqual(0);
  expect(routeTruckersActPlayData).toBeNull();

  await srvClient.sendMes({
    route: 'truckers2',
    data: 'moon',
    awaitRes: true
  });

  expect(noRouteCount).toEqual(2);
  expect(noRouteData).toEqual('moon');

  expect(routeTruckersCount).toEqual(0);
  expect(routeTruckersData).toBeNull();

  expect(routeTruckersActPlayCount).toEqual(0);
  expect(routeTruckersActPlayData).toBeNull();

  await srvClient.sendMes({
    route: 'truckers2',
    act: 'play',
    data: 'sun',
    awaitRes: true
  });

  expect(noRouteCount).toEqual(3);
  expect(noRouteData).toEqual('sun');

  expect(routeTruckersCount).toEqual(0);
  expect(routeTruckersData).toBeNull();

  expect(routeTruckersActPlayCount).toEqual(0);
  expect(routeTruckersActPlayData).toBeNull();

  client.stop();
  server.stop();

});

test('server send mes', async (done) => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 5001,
  };

  const server = new jrfWS.Server(srvParams);

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:5001'
  };

  const client = new jrfWS.Client(clnParams);
  client.addRoute({
    handler: ({ws, data, stop}) => {

      server.stop();
      client.stop();

      expect(data).toEqual('any type data');

      done();

    }
  });

  // Process

  server.start();
  client.start();

  await wait(100);

  const srvClient = Object.values(server.clients)[0];
  await srvClient.sendMes({data: 'any type data'});

});

test('client send mes', async (done) => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 5002,
  };

  const server = new jrfWS.Server(srvParams);

  server.addRoute({
    handler: ({ws, groups, data, mes, stop, raw}) => {

      server.stop();
      client.stop();

      expect(data).toEqual('any type data');

      done();

    }
  });

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:5002'
  };

  const client = new jrfWS.Client(clnParams);

  // Process

  server.start();
  client.start();

  await wait(100);

  await client.sendMes({data: 'any type data'});

});

test('server send mes await res', async () => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 5003,
  };

  const server = new jrfWS.Server(srvParams);

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:5003'
  };

  const client = new jrfWS.Client(clnParams);
  client.addRoute({
    handler: ({ws, data, stop}) => {
      return 'any type data';
    }
  });

  // Process

  server.start();
  client.start();

  await wait(100);

  const srvClient = Object.values(server.clients)[0];
  const res = await srvClient.sendMes({data: 'any', awaitRes: true});

  server.stop();
  client.stop();

  expect(res).toEqual('any type data');

});

test('client send mes await res', async () => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 5004,
  };

  const server = new jrfWS.Server(srvParams);

  server.addRoute({
    handler: ({ws, groups, data, mes, stop, raw}) => {
      return 'any type data';
    }
  });

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:5004'
  };

  const client = new jrfWS.Client(clnParams);

  // Process

  server.start();
  client.start();

  await wait(100);

  const res = await client.sendMes({data: 'any', awaitRes: true});

  server.stop();
  client.stop();

  expect(res).toEqual('any type data');

});

test('server send mes res in callback', async (done) => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 5005,
  };

  const server = new jrfWS.Server(srvParams);

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:5005'
  };

  const client = new jrfWS.Client(clnParams);
  client.addRoute({
    handler: ({ws, data, stop}) => {
      return 'any type data';
    }
  });

  // Process

  server.start();
  client.start();

  await wait(100);

  let execCbAfterSend = false;
  const cbAfterSend = () => {
    execCbAfterSend = true;
  };

  const cbAfterRes = async ({error, res}) => {

    server.stop();
    client.stop();

    expect(execCbAfterSend).toBeTruthy();
    expect(res).toEqual('any type data');

    done();

  };

  const srvClient = Object.values(server.clients)[0];
  await srvClient.sendMes({data: 'any', cbAfterSend, cbAfterRes});

});

test('client send mes res in callback', async (done) => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 5006,
  };

  const server = new jrfWS.Server(srvParams);
  server.addRoute({
    handler: ({ws, data, stop}) => {
      return 'any type data';
    }
  });

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:5006'
  };

  const client = new jrfWS.Client(clnParams);

  // Process

  server.start();
  client.start();

  await wait(100);

  let execCbAfterSend = false;
  const cbAfterSend = () => {
    execCbAfterSend = true;
  };

  const cbAfterRes = async ({error, res}) => {

    server.stop();
    client.stop();

    expect(execCbAfterSend).toBeTruthy();
    expect(res).toEqual('any type data');

    done();

  };

  await client.sendMes({data: 'any', cbAfterSend, cbAfterRes});

});

test('server send mes await res timeout', async () => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 5007,
  };

  const server = new jrfWS.Server(srvParams);

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:5007'
  };

  const client = new jrfWS.Client(clnParams);
  client.addRoute({
    handler: async ({ws, data, stop}) => {
      await wait(120);
      return 'any type data';
    }
  });

  // Process

  server.start();
  client.start();

  await wait(100);

  const srvClient = Object.values(server.clients)[0];

  let error;
  try {
    const res = await srvClient.sendMes({data: 'any', awaitRes: true, timeout: 100});
  } catch (e) {
    error = e;
  }

  server.stop();
  client.stop();

  expect(error.message.includes('timed out 100')).toBeTruthy();

});

test('client send mes await res timeout', async () => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 5008,
  };

  const server = new jrfWS.Server(srvParams);
  server.addRoute({
    handler: async ({ws, data, stop}) => {
      await wait(120);
      return 'any type data';
    }
  });

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:5008'
  };

  const client = new jrfWS.Client(clnParams);

  // Process

  server.start();
  client.start();

  await wait(100);

  let error;
  try {
    const res = await client.sendMes({data: 'any', awaitRes: true, timeout: 100});
  } catch (e) {
    error = e;
  }

  server.stop();
  client.stop();

  expect(error.message.includes('timed out 100')).toBeTruthy();

});

test('server send mes res in callback timeout', async (done) => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 5009,
  };

  const server = new jrfWS.Server(srvParams);

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:5009'
  };

  const client = new jrfWS.Client(clnParams);
  client.addRoute({
    handler: async ({ws, data, stop}) => {
      await wait(300);
      return 'any type data';
    }
  });

  // Process

  server.start();
  client.start();

  await wait(100);

  let execCbAfterSend = false;
  const cbAfterSend = () => {
    execCbAfterSend = true;
  };

  const cbAfterRes = async ({error, res}) => {

    server.stop();
    client.stop();

    expect(execCbAfterSend).toBeTruthy();
    expect(error.message.includes('timed out 100')).toBeTruthy();
    expect(res).toBeNull();

    done();

  };

  const srvClient = Object.values(server.clients)[0];
  await srvClient.sendMes({data: 'any', cbAfterSend, cbAfterRes, timeout: 100});

});

test('client send mes res in callback timeout', async (done) => {

  // Server rick

  const srvParams = {
    id: 'rick',
    port: 5010,
  };

  const server = new jrfWS.Server(srvParams);
  server.addRoute({
    handler: async ({ws, data, stop}) => {
      await wait(300);
      return 'any type data';
    }
  });

  // Client morty

  const clnParams = {
    id: 'morty',
    url: 'ws://localhost:5010'
  };

  const client = new jrfWS.Client(clnParams);

  // Process

  server.start();
  client.start();

  await wait(100);

  let execCbAfterSend = false;
  const cbAfterSend = () => {
    execCbAfterSend = true;
  };

  const cbAfterRes = async ({error, res}) => {

    server.stop();
    client.stop();

    expect(execCbAfterSend).toBeTruthy();
    expect(error.message.includes('timed out 100')).toBeTruthy();
    expect(res).toBeNull();

    done();

  };

  await client.sendMes({data: 'any', cbAfterSend, cbAfterRes, timeout: 100});

});

test('server horizontal scaling, client round-robin', async () => {

  // Server clones

  const cloneParams1 = {
    id: 'clone1',
    port: 5011,
  };

  const clone1 = new jrfWS.Server(cloneParams1);
  clone1.start();

  const cloneParams2 = {
    id: 'clone2',
    port: 5012,
  };

  const clone2 = new jrfWS.Server(cloneParams2);
  clone2.start();

  const cloneParams3 = {
    id: 'clone3',
    port: 5013,
  };

  const clone3 = new jrfWS.Server(cloneParams3);
  clone3.start();

  // Client

  const clientParams = {
    id: 'client',
    reconnectTimeout: 50
  };
  const client = new jrfWS.Client(clientParams);

  client.addUrl('ws://localhost:5011');
  client.addUrl(['ws://localhost:5012', 'ws://localhost:5013']);

  // Process

  client.start();
  expect(Array.from(client.urls)).toMatchObject(['ws://localhost:5011', 'ws://localhost:5012', 'ws://localhost:5013']);
  await wait(100);
  expect(client.url).toEqual('ws://localhost:5011');

  clone1.stop();
  await wait(100);
  expect(client.url).toEqual('ws://localhost:5012');

  clone2.stop();
  await wait(100);
  expect(client.url).toEqual('ws://localhost:5013');

  clone3.stop();
  await wait(100);
  expect(client.countAttempts).toBeGreaterThanOrEqual(1);

  client.stop();

});

test('server and clients and groups', async () => {

  // Server clones

  const cloneParams1 = {
    id: 'clone1',
    port: 4010,
  };

  const clone11 = new jrfWS.Server(cloneParams1);

  // Clients

  const clientParams1 = {
    id: 'client1',
    url: 'ws://localhost:4010',
  };

  const client11 = new jrfWS.Client(clientParams1);

  const clientParams2 = {
    id: 'client2',
    url: 'ws://localhost:4010',
  };

  const client12 = new jrfWS.Client(clientParams2);

  // Process

  clone11.start();
  client11.start();
  client12.start();

  await wait(100);

  expect(Object.keys(clone11.clients).length).toEqual(2);
  expect(clone11.groups.cache.groups).toBeNull();

  // Server add group and client2 subscribe

  const ws = Object.values(clone11.clients)[1];

  clone11.groups.add({
    id: 'truckers2',
    ws,
    data: {description: 'super game group'}
  });

  let cloneGroups1 = clone11.groups.get();
  let clientGroups1 = await client11.getMyGroups();
  let clientGroups2 = await client12.getMyGroups();

  expect(Object.keys(cloneGroups1)).toMatchObject(['truckers2']);
  expect(clientGroups1).toMatchObject([]);
  expect(clientGroups2).toMatchObject(['truckers2']);

  // Client1 add group trucker and subscribe

  client11.subscribe({id: 'truckers'});
  client12.subscribe({id: 'truckers'});

  cloneGroups1 = clone11.groups.get();
  clientGroups1 = await client11.getMyGroups();
  clientGroups2 = await client12.getMyGroups();

  expect(Object.keys(cloneGroups1)).toMatchObject(['truckers2', 'truckers']);
  expect(clientGroups1).toMatchObject(['truckers']);
  expect(clientGroups2).toMatchObject(['truckers2', 'truckers']);

  // Server send message to truckers2

  let clientData1 = null;
  client11.addRoute({
    handler: async ({ws, data, stop}) => {
      clientData1 = data;
    }
  });

  let clientData2 = null;
  client12.addRoute({
    handler: ({ws, data, stop}) => {
      clientData2 = data;
    }
  });

  await clone11.groups.sendMes({
    id: 'truckers2',
    route: 'srvMsg',
    data: {description: 'server message to truckers2 group'}
  });

  await wait(100);

  expect(clientData1).toBeNull();
  expect(clientData2).toMatchObject({description: 'server message to truckers2 group'});

  // Client1 send message to truckers group

  await client11.sendMesToGroup({
    id: 'truckers',
    data: 'hello from client1'
  });

  await wait(100);

  expect(clientData1).toEqual('hello from client1');
  expect(clientData2).toEqual('hello from client1');

  // Client1 send message to truckers group notSendMe

  clientData1 = null;
  clientData2 = null;

  await client12.sendMesToGroup({
    id: 'truckers',
    data: 'hello from client2',
    notSendMe: true
  });

  await wait(100);

  expect(clientData1).toEqual('hello from client2');
  expect(clientData2).toBeNull();

  // Client 2 unsubscribe truckers2

  clientGroups2 = await client12.getMyGroups();

  expect(clientGroups2).toMatchObject(['truckers2', 'truckers']);
  expect(Object.keys(clone11.groups.cache.groups)).toMatchObject(['truckers2', 'truckers']);
  expect(clone11.groups.cache.groups.truckers.length).toEqual(2);
  expect(clone11.groups.cache.groups.truckers2.length).toEqual(1);

  await client12.unsubscribe({id: 'truckers2'});
  clientGroups2 = await client12.getMyGroups();

  expect(clientGroups2).toMatchObject(['truckers']);
  expect(Object.keys(clone11.groups.cache.groups)).toMatchObject(['truckers']);
  expect(clone11.groups.cache.groups.truckers.length).toEqual(2);

  client11.stop();
  client12.stop();
  clone11.stop();

});

test('server horizontal scaling, clones send mes to group', async () => {

  // Server clones

  const authFnIn = (authValue) => {
    return authValue === 'token';
  };

  const authFnOut = () => 'token';

  const cloneParams1 = {
    id: 'clone1',
    port: 4001,
    authFnIn
  };

  const clone1 = new jrfWS.Server(cloneParams1);
  clone1.clones.interval = 300;
  clone1.start();

  const cloneParams2 = {
    id: 'clone2',
    port: 4002,
    authFnIn,
    authFnOut,
  };

  const clone2 = new jrfWS.Server(cloneParams2);
  clone2.clones.interval = 300;
  clone2.start();

  const cloneParams3 = {
    id: 'clone3',
    port: 4003,
    authFnIn,
    authFnOut,
  };

  const clone3 = new jrfWS.Server(cloneParams3);
  clone3.clones.interval = 300;
  clone3.start();

  await wait(100);

  expect(clone1.clones.clones.size).toEqual(0);
  expect(clone2.clones.clones.size).toEqual(0);
  expect(clone3.clones.clones.size).toEqual(0);

  // clone2 add clone3

  clone2.addClone({id: 'clone3', url: 'ws://localhost:4003'});

  await wait(100);

  expect(clone2.clones.clones.size).toEqual(1);
  expect(Object.keys(clone2.clones.cache.id)).toEqual(['clone3']);
  expect(Object.keys(clone2.clones.cache.url)).toEqual(['ws://localhost:4003']);
  expect(Object.keys(clone2.clones.cache.active)).toEqual(['clone3']);

  // clone1 add clone2, no connect as not token function authFnOut

  clone1.addClone({id: 'clone2', url: 'ws://localhost:4002'});

  await wait(200);

  expect(clone1.clones.clones.size).toEqual(1);
  expect(Object.keys(clone1.clones.cache.id)).toEqual(['clone2']);
  expect(Object.keys(clone1.clones.cache.url)).toEqual(['ws://localhost:4002']);

  // clone1 add clone2 with token from authFnOut
  // clone2 return self all clones (clone3)
  // clone1 has active clone2
  // clone3 no active as clone1 no has authFnOut
  clone1.addClone({id: 'clone2', url: 'ws://localhost:4002', authFnOut});

  await wait(400);

  expect(clone1.clones.clones.size).toEqual(2);
  expect(Object.keys(clone1.clones.cache.id)).toEqual(['clone2', 'clone3']);
  expect(Object.keys(clone1.clones.cache.url)).toEqual(['ws://localhost:4002', 'ws://localhost:4003']);
  expect(Object.keys(clone1.clones.cache.active)).toEqual(['clone2']);

  // clone1 update authFnOut
  // clone1 has active clone2 and clone3
  clone1.updateAuthFnOut({authFnOut});

  await wait(400);

  expect(clone1.clones.clones.size).toEqual(2);
  expect(Object.keys(clone1.clones.cache.id)).toEqual(['clone2', 'clone3']);
  expect(Object.keys(clone1.clones.cache.url)).toEqual(['ws://localhost:4002', 'ws://localhost:4003']);
  expect(Object.keys(clone1.clones.cache.active)).toEqual(['clone2', 'clone3']);

  // clone3 add clone1
  // clone1 return self all clones (clone2)
  // clone3 has active clone2 and clone1
  clone3.clones.delete({id: 'clone1'});
  clone3.authFnOut = authFnOut;
  clone3.addClone({id: 'clone1', url: 'ws://localhost:4001'});

  await wait(400);

  expect(clone3.clones.clones.size).toEqual(2);
  expect(Object.keys(clone3.clones.cache.id)).toMatchObject(['clone2', 'clone1']);
  expect(Object.keys(clone3.clones.cache.url)).toEqual(['ws://localhost:4002', 'ws://localhost:4001']);
  expect(Object.keys(clone3.clones.cache.active)).toEqual(['clone2', 'clone1']);

  // Create client1 connect to clone1, add group truckers2

  const client1 = new jrfWS.Client({
    id: 'client1',
    url: 'ws://localhost:4001',
    reconnectTimeout: 200
  });

  client1.start();
  await wait(100);
  await client1.subscribe({id: 'truckers2'});

  expect(Object.keys(clone1.groups.cache.groups)).toMatchObject(['truckers2']);
  expect(Array.from(client1.groups)).toMatchObject(['truckers2']);
  expect(clone2.groups.cache.groups).toBeNull();
  expect(clone3.groups.cache.groups).toBeNull();

  // Create client2 connect to clone2, subscribe truckers2
  // and add group truckers

  const client2 = new jrfWS.Client({
    id: 'client2',
    url: 'ws://localhost:4002',
    reconnectTimeout: 200
  });

  client2.start();
  await wait(100);
  await client2.subscribe({id: 'truckers2'});
  await client2.subscribe({id: 'truckers'});

  expect(Object.keys(clone1.groups.cache.groups)).toMatchObject(['truckers2']);
  expect(Object.keys(clone2.groups.cache.groups)).toMatchObject(['truckers2', 'truckers']);
  expect(Array.from(client2.groups)).toMatchObject(['truckers2', 'truckers']);
  expect(clone3.groups.cache.groups).toBeNull();

  // Create client3 connect to clone3, subscribe truckers

  const client3 = new jrfWS.Client({
    id: 'client3',
    url: 'ws://localhost:4003',
    reconnectTimeout: 200
  });

  client3.start();
  await wait(100);
  await client3.subscribe({id: 'truckers'});

  expect(Object.keys(clone1.groups.cache.groups)).toMatchObject(['truckers2']);
  expect(Object.keys(clone2.groups.cache.groups)).toMatchObject(['truckers2', 'truckers']);
  expect(Object.keys(clone3.groups.cache.groups)).toMatchObject(['truckers']);
  expect(Array.from(client3.groups)).toMatchObject(['truckers']);

  // clients add routes

  let clientMes1 = null;
  let clientCount1 = 0;
  client1.addRoute({
    handler: ({ws, data, stop}) => {
      clientMes1 = data;
      clientCount1++;
    }
  });

  let clientMes2 = null;
  let clientCount2 = 0;
  client2.addRoute({
    handler: ({ws, data, stop}) => {
      clientMes2 = data;
      clientCount2++;
    }
  });

  let clientMes3 = null;
  let clientCount3 = 0;
  client3.addRoute({
    handler: ({ws, data, stop}) => {
      clientMes3 = data;
      clientCount3++;
    }
  });

  expect(clientMes1).toBeNull();
  expect(clientMes2).toBeNull();
  expect(clientMes3).toBeNull();

  expect(clientCount1).toEqual(0);
  expect(clientCount2).toEqual(0);
  expect(clientCount3).toEqual(0);

  // clients subscribe to group all

  await client1.subscribe({id: 'all'});
  await client2.subscribe({id: 'all'});
  await client3.subscribe({id: 'all'});

  await wait(100);

  expect(Object.keys(clone1.groups.cache.groups)).toMatchObject(['truckers2', 'all']);
  expect(Object.keys(clone2.groups.cache.groups)).toMatchObject(['truckers2', 'truckers', 'all']);
  expect(Object.keys(clone3.groups.cache.groups)).toMatchObject(['truckers', 'all']);
  expect(Array.from(client1.groups)).toMatchObject(['truckers2', 'all']);
  expect(Array.from(client2.groups)).toMatchObject(['truckers2', 'truckers', 'all']);
  expect(Array.from(client3.groups)).toMatchObject(['truckers', 'all']);

  // client1 send mes to all group

  await client1.sendMesToGroup({id: 'all', data: 'message to all group from client1'});

  await wait(100);

  expect(clientMes1).toEqual('message to all group from client1');
  expect(clientMes2).toEqual('message to all group from client1');
  expect(clientMes3).toEqual('message to all group from client1');

  expect(clientCount1).toEqual(1);
  expect(clientCount2).toEqual(1);
  expect(clientCount3).toEqual(1);

  // client1 send mes to all group with notSendMe

  clientMes1 = null;
  clientMes2 = null;
  clientMes3 = null;

  clientCount1 = 0;
  clientCount2 = 0;
  clientCount3 = 0;

  await client1.sendMesToGroup({id: 'all', data: 'message to all group from client1', notSendMe: true});

  await wait(100);

  expect(clientMes1).toBeNull();
  expect(clientMes2).toEqual('message to all group from client1');
  expect(clientMes3).toEqual('message to all group from client1');

  expect(clientCount1).toEqual(0);
  expect(clientCount2).toEqual(1);
  expect(clientCount3).toEqual(1);

  // client2 send mes to truckers2 group

  clientMes1 = null;
  clientMes2 = null;
  clientMes3 = null;

  clientCount1 = 0;
  clientCount2 = 0;
  clientCount3 = 0;

  await client2.sendMesToGroup({id: 'truckers2', data: 'message to truckers2 group from client2'});

  await wait(100);

  expect(clientMes1).toEqual('message to truckers2 group from client2');
  expect(clientMes2).toEqual('message to truckers2 group from client2');
  expect(clientMes3).toBeNull();

  expect(clientCount1).toEqual(1);
  expect(clientCount2).toEqual(1);
  expect(clientCount3).toEqual(0);

  // client1 stop

  client1.stop();

  await wait(100);

  expect(client1.active).toBeFalsy();
  expect(client2.active).toBeTruthy();
  expect(client3.active).toBeTruthy();

  expect(Object.keys(clone1.clients).length).toEqual(2);
  expect(Object.keys(clone2.clients).length).toEqual(3);
  expect(Object.keys(clone3.clients).length).toEqual(3);

  // client1 connect to clone3

  client1.deleteUrl('ws://localhost:4001');
  client1.addUrl('ws://localhost:4003');
  client1.nextUrl();
  client1.start();

  await wait(100);

  expect(Object.keys(clone1.clients).length).toEqual(2);
  expect(Object.keys(clone2.clients).length).toEqual(3);
  expect(Object.keys(clone3.clients).length).toEqual(4);

  expect(Object.keys(clone1.groups.cache.groups)).toMatchObject([]);
  expect(Object.keys(clone2.groups.cache.groups)).toMatchObject(['truckers2', 'truckers', 'all']);
  expect(Object.keys(clone3.groups.cache.groups)).toMatchObject(['truckers', 'all', 'truckers2']);

  expect(Array.from(client1.groups)).toMatchObject(['truckers2', 'all']);
  expect(Array.from(client2.groups)).toMatchObject(['truckers2', 'truckers', 'all']);
  expect(Array.from(client3.groups)).toMatchObject(['truckers', 'all']);

  // client2 send mes to truckers2 group

  clientMes1 = null;
  clientMes2 = null;
  clientMes3 = null;

  clientCount1 = 0;
  clientCount2 = 0;
  clientCount3 = 0;

  await client2.sendMesToGroup({id: 'truckers2', data: 'message to truckers2 group from client2'});

  await wait(100);

  expect(clientMes1).toEqual('message to truckers2 group from client2');
  expect(clientMes2).toEqual('message to truckers2 group from client2');
  expect(clientMes3).toBeNull();

  expect(clientCount1).toEqual(1);
  expect(clientCount2).toEqual(1);
  expect(clientCount3).toEqual(0);

  // stop clone2 and clone3

  client1.addUrl('ws://localhost:4001');
  client2.addUrl('ws://localhost:4001');
  client3.addUrl('ws://localhost:4001');

  clone2.stop();
  clone3.stop();

  await wait(1000);

  expect(Object.keys(clone1.clients).length).toEqual(3);
  expect(Object.keys(clone2.clients).length).toEqual(0);
  expect(Object.keys(clone3.clients).length).toEqual(0);

  expect(Object.keys(clone2.groups.cache.groups)).toMatchObject([]);
  expect(Object.keys(clone3.groups.cache.groups)).toMatchObject([]);
  expect(Object.keys(clone1.groups.cache.groups)).toMatchObject(['truckers2', 'all', 'truckers']);

  // client1 send mes to all group

  clientMes1 = null;
  clientMes2 = null;
  clientMes3 = null;

  clientCount1 = 0;
  clientCount2 = 0;
  clientCount3 = 0;

  await client1.sendMesToGroup({id: 'all', data: 'message to all group from client1'});

  await wait(100);

  expect(clientMes1).toEqual('message to all group from client1');
  expect(clientMes2).toEqual('message to all group from client1');
  expect(clientMes3).toEqual('message to all group from client1');

  expect(clientCount1).toEqual(1);
  expect(clientCount2).toEqual(1);
  expect(clientCount3).toEqual(1);

  client1.stop();
  client2.stop();
  client3.stop();

  clone1.stop();
  clone2.stop();
  clone3.stop();

});

test('server horizontal scaling, get remote clones', async () => {

  const cloneParams1 = {
    id: 'clone1',
    url: 'ws://localhost:9001',
    port: 9001
  };

  const clone1 = new jrfWS.Server(cloneParams1);
  clone1.clones.interval = 300;
  clone1.start();

  const cloneParams2 = {
    id: 'clone2',
    url: 'ws://localhost:9002',
    port: 9002
  };

  const clone2 = new jrfWS.Server(cloneParams2);
  clone2.clones.interval = 300;
  clone2.start();

  const cloneParams3 = {
    id: 'clone3',
    url: 'ws://localhost:9003',
    port: 9003
  };

  const clone3 = new jrfWS.Server(cloneParams3);
  clone3.clones.interval = 300;
  clone3.start();

  // clone2 add clone3

  clone2.addClone({id: 'clone3', url: 'ws://localhost:9003'});

  await wait(500);

  expect(clone2.clones.clones.size).toEqual(1);
  expect(Object.keys(clone2.clones.cache.id)).toEqual(['clone3']);
  expect(Object.keys(clone2.clones.cache.url)).toEqual(['ws://localhost:9003']);
  expect(Object.keys(clone2.clones.cache.active)).toEqual(['clone3']);

  expect(clone3.clones.clones.size).toEqual(1);
  expect(Object.keys(clone3.clones.cache.id)).toEqual(['clone2']);
  expect(Object.keys(clone3.clones.cache.url)).toEqual(['ws://localhost:9002']);
  expect(Object.keys(clone3.clones.cache.active)).toEqual(['clone2']);

  // clone1 add clone3

  clone1.addClone({id: 'clone3', url: 'ws://localhost:9003'});

  await wait(500);

  expect(clone1.clones.clones.size).toEqual(2);
  expect(Object.keys(clone1.clones.cache.id)).toEqual(['clone3', 'clone2']);
  expect(Object.keys(clone1.clones.cache.url)).toEqual(['ws://localhost:9003', 'ws://localhost:9002']);
  expect(Object.keys(clone1.clones.cache.active)).toEqual(['clone3', 'clone2']);

  expect(clone2.clones.clones.size).toEqual(2);
  expect(Object.keys(clone2.clones.cache.id)).toEqual(['clone3', 'clone1']);
  expect(Object.keys(clone2.clones.cache.url)).toEqual(['ws://localhost:9003', 'ws://localhost:9001']);
  expect(Object.keys(clone2.clones.cache.active)).toEqual(['clone3', 'clone1']);

  expect(clone3.clones.clones.size).toEqual(2);
  expect(Object.keys(clone3.clones.cache.id)).toEqual(['clone2', 'clone1']);
  expect(Object.keys(clone3.clones.cache.url)).toEqual(['ws://localhost:9002', 'ws://localhost:9001']);
  expect(Object.keys(clone3.clones.cache.active)).toEqual(['clone2', 'clone1']);

  clone1.stop();
  clone2.stop();
  clone3.stop();

});

test('server horizontal scaling, delete groups', async () => {

  const cloneParams1 = {
    id: 'clone1',
    url: 'ws://localhost:9004',
    port: 9004
  };

  const clone1 = new jrfWS.Server(cloneParams1);
  clone1.clones.interval = 300;
  clone1.start();

  const cloneParams2 = {
    id: 'clone2',
    url: 'ws://localhost:9005',
    port: 9005
  };

  const clone2 = new jrfWS.Server(cloneParams2);
  clone2.clones.interval = 300;
  clone2.start();

  const cloneParams3 = {
    id: 'clone3',
    url: 'ws://localhost:9006',
    port: 9006
  };

  const clone3 = new jrfWS.Server(cloneParams3);
  clone3.clones.interval = 300;
  clone3.start();

  clone2.addClone({id: 'clone3', url: 'ws://localhost:9006'});
  clone1.addClone({id: 'clone3', url: 'ws://localhost:9006'});

  await wait(500);

  // add group truckers2

  let eventGroup1 = false;
  let eventGroup2 = false;
  let eventGroup3 = false;

  clone1.groups.on('add', () => eventGroup1 = true);
  clone1.groups.add({id: 'truckers2'});

  clone2.groups.on('add', () => eventGroup2 = true);
  clone2.groups.add({id: 'truckers2'});

  clone3.groups.on('add', () => eventGroup3 = true);
  clone3.groups.add({id: 'truckers2'});

  expect(eventGroup1).toBeTruthy();
  expect(Object.keys(clone1.groups.cache.groups)).toEqual(['truckers2']);

  expect(eventGroup2).toBeTruthy();
  expect(Object.keys(clone2.groups.cache.groups)).toEqual(['truckers2']);

  expect(eventGroup3).toBeTruthy();
  expect(Object.keys(clone3.groups.cache.groups)).toEqual(['truckers2']);

  // add group truckers

  eventGroup1 = false;
  eventGroup2 = false;
  eventGroup3 = false;

  clone1.groups.add({id: 'truckers'});
  clone2.groups.add({id: 'truckers'});
  clone3.groups.add({id: 'truckers'});

  expect(eventGroup1).toBeTruthy();
  expect(Object.keys(clone1.groups.cache.groups)).toEqual(['truckers2', 'truckers']);

  expect(eventGroup2).toBeTruthy();
  expect(Object.keys(clone2.groups.cache.groups)).toEqual(['truckers2', 'truckers']);

  expect(eventGroup3).toBeTruthy();
  expect(Object.keys(clone3.groups.cache.groups)).toEqual(['truckers2', 'truckers']);

  // delete group truckers

  eventGroup1 = false;
  eventGroup2 = false;
  eventGroup3 = false;

  clone1.groups.on('delete', () => eventGroup1 = true);
  clone2.groups.on('delete', () => eventGroup2 = true);
  clone3.groups.on('delete', () => eventGroup3 = true);

  clone1.groups.delete({id: 'truckers'});

  await wait(500);

  expect(eventGroup1).toBeTruthy();
  expect(Object.keys(clone1.groups.cache.groups)).toEqual(['truckers2']);

  expect(eventGroup2).toBeTruthy();
  expect(Object.keys(clone2.groups.cache.groups)).toEqual(['truckers2']);

  expect(eventGroup3).toBeTruthy();
  expect(Object.keys(clone3.groups.cache.groups)).toEqual(['truckers2']);

  clone1.stop();
  clone2.stop();
  clone3.stop();

});

test('ssl wss', async () => {

  const cloneParams1 = {
    id: 'clone1',
    port: 8001,
  };

  const clone1 = new jrfWS.Server(cloneParams1);

  const server = https.createServer({
    cert: fs.readFileSync(`${process.cwd()}/tests/keys/cert.pem`),
    key: fs.readFileSync(`${process.cwd()}/tests/keys/key.pem`)
  });

  clone1.start({server});

  server.listen(8001);

  const client = new jrfWS.Client({
    id: 'client',
    url: 'wss://localhost:8001/'
  });

  const opts = {
    origin: 'https://localhost:8001',
    rejectUnauthorized: false
  };
  client.start({opts});

  await wait(100);

  await client.sendMes({data: 'test', timeout: 1000, awaitRes: true});

  expect(client.active).toBeTruthy();

  client.stop();
  clone1.stop();
  server.close();

});
