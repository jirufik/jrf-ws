const WS = require('./ws');
const wait = require('../../utils/wait');

const socket = {

  messages: [],

  send(mes, opts, cbAfterSend) {

    this.messages.push(JSON.parse(mes));

    const isFunc = typeof cbAfterSend === 'function';
    if (isFunc) {
      cbAfterSend();
    }

  },

  close() {

  }

};

test('Empty constructor', () => {

  const ws = new WS({});

  expect(ws.id).not.toBeUndefined();
  expect(ws.socket).toBeUndefined();
  expect(ws.data).toEqual({});
  expect(ws.clone).toBeUndefined();
  expect(ws.groups.size).toEqual(0);
  expect(ws.timeouts.awaitRes).toEqual(10000);
  expect(ws.timeouts.awaitCycle).toEqual(15);
  expect(ws._awaitQueue).toEqual({});

});

test('Constructor with parameters', () => {

  const ws = new WS({socket, data: 'data', clone: true});

  expect(ws.id).not.toBeUndefined();
  expect(ws.socket).toEqual(socket);
  expect(ws.data).toEqual('data');
  expect(ws.clone).toBeTruthy();
  expect(ws.groups.size).toEqual(0);
  expect(ws.timeouts.awaitRes).toEqual(10000);
  expect(ws.timeouts.awaitCycle).toEqual(15);
  expect(ws._awaitQueue).toEqual({});

});

test('_generateMes without params', () => {

  const ws = new WS({socket});

  const res = ws._generateMes({});

  expect(res.type).toEqual('message');
  expect(res.route).toBeUndefined();
  expect(res.act).toBeUndefined();
  expect(res.data).toBeUndefined();
  expect(res.system.id).not.toBeUndefined();
  expect(res.system.uid).not.toBeUndefined();
  expect(res.system.created).not.toBeUndefined();
  expect(res.system.ws.id).toEqual(ws.id);

});

test('_generateMes without params, ws is clone', () => {

  const ws = new WS({socket, clone: true});

  const res = ws._generateMes({});

  expect(res.type).toEqual('system');
  expect(res.route).toBeUndefined();
  expect(res.act).toBeUndefined();
  expect(res.data).toBeUndefined();
  expect(res.system.id).not.toBeUndefined();
  expect(res.system.uid).not.toBeUndefined();
  expect(res.system.created).not.toBeUndefined();
  expect(res.system.ws.id).toEqual(ws.id);

});

test('_generateMes with params', () => {

  const ws = new WS({socket});

  const res = ws._generateMes({
    id: 'id',
    uid: 'uid',
    route: 'route',
    act: 'act',
    data: 'data',
    addAwait: true,
    idMesAwaitRes: 'idMesAwaitRes',
    type: 'type'
  });

  expect(res.type).toEqual('type');
  expect(res.route).toEqual('route');
  expect(res.act).toEqual('act');
  expect(res.data).toEqual('data');
  expect(res.system.id).toEqual('id');
  expect(res.system.uid).toEqual('uid');
  expect(res.system.created).not.toBeUndefined();
  expect(res.system.ws.id).toEqual(ws.id);
  expect(res.system.awaitRes).toBeTruthy();
  expect(res.system.idMesAwaitRes).toEqual('idMesAwaitRes');

});

test('_processTimeout, awaitRes', async () => {

  const ws = new WS({socket});

  ws._awaitQueue = {
    idMes: {
      awaitRes: true
    }
  }

  const id = 'idMes';
  const timeout = 1000;

  let error;

  try {
    await ws._processTimeout({id, timeout});
  } catch (e) {
    error = e;
  }

  expect(error.message).toEqual('Message id idMes timed out 1000');
  expect(ws._awaitQueue.idMes).toBeUndefined();

});

test('_processTimeout, cb', async (done) => {

  const ws = new WS({socket});

  const cbAfterRes = ({error, res}) => {

    expect(error.message).toEqual('Message id idMes timed out 1000');
    expect(res).toBeNull();
    expect(ws._awaitQueue.idMes).toBeUndefined();

    done();

  }

  ws._awaitQueue = {
    idMes: {
      cbAfterRes
    }
  }

  const id = 'idMes';
  const timeout = 1000;

  await ws._processTimeout({id, timeout});

});

test('_processTimeout, async cb', async (done) => {

  const ws = new WS({socket});

  const cbAfterRes = async ({error, res}) => {

    expect(error.message).toEqual('Message id idMes timed out 1000');
    expect(res).toBeNull();
    expect(ws._awaitQueue.idMes).toBeUndefined();

    done();

  }

  ws._awaitQueue = {
    idMes: {
      cbAfterRes
    }
  }

  const id = 'idMes';
  const timeout = 1000;

  await ws._processTimeout({id, timeout});

});

test('_processRes, awaitRes', async () => {

  const ws = new WS({socket});

  ws._awaitQueue = {
    idMes: {
      awaitRes: true,
      res: 'res'
    }
  }

  const res = await ws._processRes({id: 'idMes'});

  expect(res).toEqual('res');
  expect(ws._awaitQueue.idMes).toBeUndefined();

});

test('_processRes, cb', async (done) => {

  const ws = new WS({socket});

  const cbAfterRes = ({error, res}) => {

    expect(error).toBeNull();
    expect(res).toEqual('res');
    expect(ws._awaitQueue.idMes).toBeUndefined();

    done();

  }

  ws._awaitQueue = {
    idMes: {
      cbAfterRes,
      res: 'res'
    }
  }

  await ws._processRes({id: 'idMes'});

});

test('_processRes, async cb', async (done) => {

  const ws = new WS({socket});

  const cbAfterRes = async ({error, res}) => {

    expect(error).toBeNull();
    expect(res).toEqual('res');
    expect(ws._awaitQueue.idMes).toBeUndefined();

    done();

  }

  ws._awaitQueue = {
    idMes: {
      cbAfterRes,
      res: 'res'
    }
  }

  await ws._processRes({id: 'idMes'});

});

test('fillRes, bad id', () => {

  const ws = new WS({socket});

  ws._awaitQueue = {
    idMes: {}
  }

  const id = 'badId';
  const res = 'res';

  const resFill = ws.fillRes({id, res});

  expect(resFill).toBeFalsy();
  expect(ws._awaitQueue.idMes).toEqual({});

});

test('fillRes, gotRes', () => {

  const ws = new WS({socket});

  ws._awaitQueue = {
    idMes: {
      gotRes: true
    }
  }

  const id = 'idMes';
  const res = 'res';

  const resFill = ws.fillRes({id, res});

  expect(resFill).toBeFalsy();
  expect(ws._awaitQueue.idMes).toEqual({gotRes: true});

});

test('fillRes', () => {

  const ws = new WS({socket});

  ws._awaitQueue = {
    idMes: {}
  }

  const id = 'idMes';
  const res = 'res';

  const resFill = ws.fillRes({id, res});

  expect(resFill).toBeTruthy();
  expect(ws._awaitQueue.idMes.gotRes).toBeTruthy();
  expect(ws._awaitQueue.idMes.res).toEqual('res');

});

test('stop', () => {

  const ws = new WS({socket});

  let stop = false;
  socket.close = () => stop = true;

  ws.stop();

  expect(stop).toBeTruthy();

});

test('_awaitRes, timeout error', async () => {

  const ws = new WS({socket});

  ws._awaitQueue = {
    idMes: {
      awaitRes: true,
    }
  };

  const params = {
    id: 'idMes',
    timeout: 1000,
    cycleTimeout: 20
  };

  let error;

  try {
    const res = await ws._awaitRes(params);
  } catch (e) {
    error = e;
  }

  expect(error.message).toEqual('Message id idMes timed out 1000');

});

test('_awaitRes, cb, timeout error', async (done) => {

  const ws = new WS({socket});

  const cbAfterRes = async ({error, res}) => {

    expect(res).toBeNull();
    expect(error.message).toEqual('Message id idMes timed out 1000');

    done();

  }

  ws._awaitQueue = {
    idMes: {
      cbAfterRes
    }
  };

  const params = {
    id: 'idMes',
    timeout: 1000,
    cycleTimeout: 20
  };

  await ws._awaitRes(params);

});

test('_awaitRes', async () => {

  const ws = new WS({socket});

  ws._awaitQueue = {
    idMes: {
      awaitRes: true
    }
  };

  const params = {
    id: 'idMes',
    timeout: 1000,
    cycleTimeout: 20
  };

  setTimeout(() => {
    ws._awaitQueue.idMes.res = 'res';
    ws._awaitQueue.idMes.gotRes = true;
  }, 500);

  const res = await ws._awaitRes(params);

  expect(res).toEqual('res');

});

test('_awaitRes, cb', async (done) => {

  const ws = new WS({socket});

  const cbAfterRes = async ({error, res}) => {

    expect(res).toEqual('res');
    expect(error).toBeNull();

    done();

  };

  ws._awaitQueue = {
    idMes: {
      cbAfterRes
    }
  };

  const params = {
    id: 'idMes',
    timeout: 1000,
    cycleTimeout: 20
  };

  setTimeout(() => {
    ws._awaitQueue.idMes.res = 'res';
    ws._awaitQueue.idMes.gotRes = true;
  }, 500);

  const res = await ws._awaitRes(params);

});

test('_awaitRes, error Message not found', async () => {

  const ws = new WS({socket});

  ws._awaitQueue = {
    idMes: {
      awaitRes: true
    }
  };

  const params = {
    id: 'idMes1',
    timeout: 1000,
    cycleTimeout: 20
  };

  let error;

  try {
    const res = await ws._awaitRes(params);
  } catch (e) {
    error = e;
  }

  expect(error.message).toEqual('Message not found in queue');

});

test('send mes', async () => {

  socket.messages = [];
  const ws = new WS({socket});

  let cbRun = false;
  const cbAfterSend = () => {
    cbRun = true;
  }

  const route = 'route';
  const act = 'act';
  const data = 'data';

  await ws.sendMes({route, act, data, cbAfterSend});

  const mes = socket.messages[0];

  expect(mes.route).toEqual('route');
  expect(mes.act).toEqual('act');
  expect(mes.data).toEqual('data');
  expect(cbRun).toBeTruthy();

});

test('send mes awaitRes error', async () => {

  socket.messages = [];
  const ws = new WS({socket});

  const route = 'route';
  const act = 'act';
  const data = 'data';
  const awaitRes = true;
  const timeout = 500;

  let text;
  try {
    const res = await ws.sendMes({route, act, data, awaitRes, timeout});
  } catch (e) {
    text = e.message;
  }

  const mes = socket.messages[0];
  const id = mes.system.id;

  expect(text).toEqual(`Message id ${id} timed out 500`);

});

test('send mes awaitRes', async () => {

  socket.messages = [];
  const ws = new WS({socket});

  const route = 'route';
  const act = 'act';
  const data = 'data';
  const awaitRes = true;
  const timeout = 500;

  const cbAfterSend = () => {

    const mes = socket.messages[0];
    const id = mes.system.id;

    ws.fillRes({id, res: 'res'});

  };

  const res = await ws.sendMes({route, act, data, awaitRes, timeout, cbAfterSend});

  expect(res).toEqual(`res`);

});

test('send mes cb', async (done) => {

  socket.messages = [];
  const ws = new WS({socket});

  const route = 'route';
  const act = 'act';
  const data = 'data';
  const timeout = 500;

  const cbAfterSend = () => {

    const mes = socket.messages[0];
    const id = mes.system.id;

    ws.fillRes({id, res: 'res'});

  };

  const cbAfterRes = ({error, res}) => {

    expect(error).toBeNull();
    expect(res).toEqual(`res`);

    done();

  };

  await ws.sendMes({route, act, data, timeout, cbAfterSend, cbAfterRes});

});

test('send mes cb error', async (done) => {

  socket.messages = [];
  const ws = new WS({socket});

  const route = 'route';
  const act = 'act';
  const data = 'data';
  const timeout = 500;

  let id;
  const cbAfterSend = () => {

    const mes = socket.messages[0];
    id = mes.system.id;

  };

  const cbAfterRes = ({error, res}) => {

    expect(res).toBeNull();
    expect(error.message).toEqual(`Message id ${id} timed out 500`);

    done();

  };

  await ws.sendMes({route, act, data, timeout, cbAfterSend, cbAfterRes});

});