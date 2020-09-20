const Client = require('./backendClient');

const WebSocket = require('ws');
jest.mock('ws');
WebSocket.mockImplementation(() => {
  return {};
});

const ws = {
  sendMes: async function () {

  },
  fillRes() {

  }
}

const socket = {
  readyState: 0,
  close(cb) {
    if (cb) cb();
    Promise.resolve().then(this.onclose);
  },
  onopen: async function () {

  },
  onerror: async function () {

  },
  onclose: async function () {

  },
  onmessage: async function () {

  }
}

// CONSTRUCTOR

describe('Constructor', () => {

  test('Empty constructor', () => {

    const client = new Client();
    expect(client.id).not.toBeUndefined();
    expect(client.url).toBeNull();
    expect(client.urls.size).toEqual(0);
    expect(client.active).toBeFalsy();
    expect(client.reconnect).toBeTruthy();
    expect(client.timeouts.reconnect).toEqual(2000);
    expect(client.timeouts.awaitRes).toEqual(10000);
    expect(client.timeouts.awaitCycle).toEqual(15);
    expect(client.isClone).toBeFalsy();
    expect(client.authFnOut).toBeUndefined();
    expect(client.attempts).toEqual(0);
    expect(client.countAttempts).toEqual(0);
    expect(client.data).toEqual({});
    expect(client.socket).toBeNull();
    expect(client.routes.size).toEqual(0);
    expect(client.ws).toBeNull();
    expect(client._middlewares.length).toEqual(0);

  });

  test('Constructor with params', () => {

    const client = new Client({
      id: 'id',
      url: 'url',
      data: {data: 'data'},
      reconnect: false,
      reconnectTimeout: 3000,
      awaitResTimeout: 5000,
      awaitCycleTimeout: 20,
      attempts: 5,
      isClone: true,
      authFnOut: 'authFnOut'
    });
    expect(client.id).toEqual('id');
    expect(client.url).toEqual('url');
    expect(client.urls.size).toEqual(1);
    expect(client.active).toBeFalsy();
    expect(client.reconnect).toBeFalsy();
    expect(client.timeouts.reconnect).toEqual(3000);
    expect(client.timeouts.awaitRes).toEqual(5000);
    expect(client.timeouts.awaitCycle).toEqual(20);
    expect(client.isClone).toBeTruthy();
    expect(client.authFnOut).toEqual('authFnOut');
    expect(client.attempts).toEqual(5);
    expect(client.countAttempts).toEqual(0);
    expect(client.data).toEqual({data: 'data'});
    expect(client.socket).toBeNull();
    expect(client.routes.size).toEqual(0);
    expect(client.ws).toBeNull();
    expect(client._middlewares.length).toEqual(0);

  });

});

// AUTH CLONE

describe('auth clone', () => {

  test('_authClone', async () => {

    const authFnOut = () => 'token';

    const client = new Client({authFnOut});
    client.ws = ws;
    client.socket = socket;

    let mes;
    ws.sendMes = async (message) => {
      mes = message;
      return message.data.authValue === 'token';
    };

    let close = false;
    socket.close = () => close = true;

    await client._authClone();

    expect(close).toBeFalsy();
    expect(mes.type).toEqual('system');
    expect(mes.route).toEqual('auth');
    expect(mes.data.authValue).toEqual('token');
    expect(mes.awaitRes).toBeTruthy();
    expect(mes.timeout).toEqual(5000);

  });

  test('_authClone async', async () => {

    const authFnOut = async () => 'token';

    const client = new Client({authFnOut});
    client.ws = ws;
    client.socket = socket;

    let mes;
    ws.sendMes = async (message) => {
      mes = message;
      return message.data.authValue === 'token';
    };

    let close = false;
    socket.close = () => close = true;

    await client._authClone();

    expect(close).toBeFalsy();
    expect(mes.type).toEqual('system');
    expect(mes.route).toEqual('auth');
    expect(mes.data.authValue).toEqual('token');
    expect(mes.awaitRes).toBeTruthy();
    expect(mes.timeout).toEqual(5000);

  });

  test('_authClone invalid auth', async () => {

    const authFnOut = () => 'token';

    const client = new Client({authFnOut});
    client.ws = ws;
    client.socket = socket;

    let mes;
    ws.sendMes = async (message) => {
      mes = message;
      return message.data.authValue === 'token1';
    };

    let close = false;
    socket.close = () => close = true;

    await client._authClone();

    expect(close).toBeTruthy();
    expect(mes.type).toEqual('system');
    expect(mes.route).toEqual('auth');
    expect(mes.data.authValue).toEqual('token');
    expect(mes.awaitRes).toBeTruthy();
    expect(mes.timeout).toEqual(5000);

  });

});

// MIDDLEWARES

describe('middlewares', () => {

  test('use fn not function', () => {

    const client = new Client({});

    let error;
    try {
      client.use('not function');
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('Middleware type is not a function');

  });

  test('use fn', () => {

    const client = new Client({});

    let str = '';

    const fn1 = () => {
      str += 'fn1';
    };

    const fn2 = () => {
      str += 'fn2';
    };

    const fn3 = async () => {
      str += 'fn3';
    };

    client.use(fn1);
    client.use(fn2);
    client.use(fn3);

    expect(client._middlewares[0]).toEqual(fn1);
    expect(client._middlewares[1]).toEqual(fn2);
    expect(client._middlewares[2]).toEqual(fn3);

  });

  test('_execMiddlewares return false', async () => {

    const client = new Client({});

    const mes = {
      route: 'bike',
      act: 'stop',
      data: {
        str: ''
      }
    }

    const fn1 = ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn1';
    };

    const fn2 = ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn2';
    };

    const fn3 = async ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn3';
    };

    client.use(fn1);
    client.use(fn2);
    client.use(fn3);

    const res = await client._execMiddlewares({ws, mes, raw: mes});

    expect(mes.data.str).toEqual('fn1fn2fn3');
    expect(res).toBeFalsy();

  });

  test('_execMiddlewares return true', async () => {

    const client = new Client({});

    const mes = {
      route: 'bike',
      act: 'stop',
      data: {
        str: ''
      }
    }

    const fn1 = ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn1';
    };

    const fn2 = ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn2';
      stop();
    };

    const fn3 = async ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn3';
    };

    client.use(fn1);
    client.use(fn2);
    client.use(fn3);

    const res = await client._execMiddlewares({ws, mes, raw: mes});

    expect(mes.data.str).toEqual('fn1fn2');
    expect(res).toBeTruthy();

  });

});

// ROUTING

describe('routing', () => {

  test('Add route Handler not function', () => {

    const client = new Client({});

    let msg = null;
    const message = 'The handler must be a function';
    const handler = {};

    try {
      const route = client.addRoute({handler});
    } catch (e) {
      msg = e.message;
    }

    expect(msg).toEqual(message);

  });

  test('Add route valid values', () => {

    const client = new Client({});

    const act = 'act';
    const handler = () => {
    };

    client.addRoute({route: 'route', act, handler});
    const routes = Array.from(client.routes);
    const route = routes[0];

    expect(route.route).toEqual('route');
    expect(route.act).toEqual('act');
    expect(route.handler).toEqual(handler);

  });

  test('_execRoutes, route: empty, act: empty', async () => {

    const client = new Client({});

    const mes = {
      route: '',
      act: '',
      data: {
        execCount: 0,
        value: null
      }
    };

    let route = '';
    let act = '';
    let handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'empty route';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
    };
    client.addRoute({route, act, handler});

    await client._execRoutes({ws, route: mes.route, act: mes.act, data: mes.data, mes});

    expect(mes.data.execCount).toEqual(1);
    expect(mes.data.value).toEqual('empty route');

  });

  test('_execRoutes, route: bike, act: empty', async () => {

    const client = new Client({});

    const mes = {
      route: 'bike',
      act: '',
      data: {
        execCount: 0,
        value: null
      }
    };

    let route = '';
    let act = '';
    let handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'empty route';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
    };
    client.addRoute({route, act, handler});

    await client._execRoutes({ws, route: mes.route, act: mes.act, data: mes.data, mes});

    expect(mes.data.execCount).toEqual(2);
    expect(mes.data.value).toEqual('route bike');

  });

  test('_execRoutes, route: bike, act: stop', async () => {

    const client = new Client({});

    const mes = {
      route: 'bike',
      act: 'stop',
      data: {
        execCount: 0,
        value: null
      }
    };

    let route = '';
    let act = '';
    let handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'empty route';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
    };
    client.addRoute({route, act, handler});

    await client._execRoutes({ws, route: mes.route, act: mes.act, data: mes.data, mes});

    expect(mes.data.execCount).toEqual(3);
    expect(mes.data.value).toEqual('route bike, act stop');

  });

  test('_execRoutes, route: bike, act: stop, handler stop', async () => {

    const client = new Client({});

    const mes = {
      route: 'bike',
      act: 'stop',
      data: {
        execCount: 0,
        value: null
      }
    };

    let route = '';
    let act = '';
    let handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'empty route';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
      stop();
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
    };
    client.addRoute({route, act, handler});

    await client._execRoutes({ws, route: mes.route, act: mes.act, data: mes.data, mes});

    expect(mes.data.execCount).toEqual(2);
    expect(mes.data.value).toEqual('route bike');

  });

  test('_execRoutes, route: bike, act: stop, async handler, handler stop', async () => {

    const client = new Client({});

    const mes = {
      route: 'bike',
      act: 'stop',
      data: {
        execCount: 0,
        value: null
      }
    };

    let route = '';
    let act = '';
    let handler = async ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'empty route';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = async ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
      stop();
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = async ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
    };
    client.addRoute({route, act, handler});

    await client._execRoutes({ws, route: mes.route, act: mes.act, data: mes.data, mes});

    expect(mes.data.execCount).toEqual(2);
    expect(mes.data.value).toEqual('route bike');

  });

  test('_execRoutes, route: bike, act: stop, awaitRes', async () => {

    const client = new Client({});

    const mes = {
      route: 'bike',
      act: 'stop',
      data: {
        execCount: 0,
        value: null
      },
      system: {
        awaitRes: true,
        id: '12345'
      }
    };

    let awaitRes;
    ws.sendMes = async (res) => awaitRes = res;

    let route = '';
    let act = '';
    let handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'empty route';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
      return data.value;
    };
    client.addRoute({route, act, handler});

    await client._execRoutes({ws, route: mes.route, act: mes.act, data: mes.data, mes});

    expect(awaitRes.data).toEqual('route bike, act stop');
    expect(awaitRes.idMesAwaitRes).toEqual('12345');

    expect(mes.data.execCount).toEqual(3);
    expect(mes.data.value).toEqual('route bike, act stop');

  });

  test('_processAwaitRes, return false', () => {

    const client = new Client({});

    const mes = {
      system: {
        idMesAwaitRes: null
      }
    };

    const res = client._processAwaitRes({ws, mes});

    expect(res).toBeFalsy();

  });

  test('_processAwaitRes, return true', () => {

    const client = new Client({});

    const mes = {
      system: {
        idMesAwaitRes: '12345'
      },
      data: {
        value: false
      }
    };

    ws.fillRes = ({id, res}) => res.value = id;

    const res = client._processAwaitRes({ws, mes});

    expect(res).toBeTruthy();
    expect(mes.data.value).toEqual('12345');

  });

  test('routing, fn1fn2fn3, route bike, act stop, execCount 3', async () => {

    const client = new Client({});

    const mes = {
      route: 'bike',
      act: 'stop',
      data: {
        str: '',
        value: null,
        execCount: 0
      }
    }

    const fn1 = ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn1';
    };

    const fn2 = ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn2';
    };

    const fn3 = async ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn3';
    };

    client.use(fn1);
    client.use(fn2);
    client.use(fn3);

    let route = '';
    let act = '';
    let handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'empty route';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
      return data.value;
    };
    client.addRoute({route, act, handler});

    await client._routing({mes, route: mes.route, act: mes.act, data: mes.data, raw: mes, ws});

    expect(mes.data.str).toEqual('fn1fn2fn3');
    expect(mes.data.value).toEqual('route bike, act stop');
    expect(mes.data.execCount).toEqual(3);

  });

  test('routing, fn1fn2, null, execCount 0', async () => {

    const client = new Client({});

    const mes = {
      route: 'bike',
      act: 'stop',
      data: {
        str: '',
        value: null,
        execCount: 0
      }
    }

    const fn1 = ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn1';
    };

    const fn2 = ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn2';
      stop();
    };

    const fn3 = async ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn3';
    };

    client.use(fn1);
    client.use(fn2);
    client.use(fn3);

    let route = '';
    let act = '';
    let handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'empty route';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
      return data.value;
    };
    client.addRoute({route, act, handler});

    await client._routing({mes, route: mes.route, act: mes.act, data: mes.data, raw: mes, ws});

    expect(mes.data.str).toEqual('fn1fn2');
    expect(mes.data.value).toBeNull();
    expect(mes.data.execCount).toEqual(0);

  });

  test('routing, fn1fn2fn3, null, execCount 0', async () => {

    const client = new Client({});

    const mes = {
      route: 'bike',
      act: 'stop',
      data: {
        str: '',
        value: null,
        execCount: 0
      },
      system: {
        idMesAwaitRes: '12345'
      }
    }

    const fn1 = ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn1';
    };

    const fn2 = ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn2';
    };

    const fn3 = async ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn3';
    };

    client.use(fn1);
    client.use(fn2);
    client.use(fn3);

    let route = '';
    let act = '';
    let handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'empty route';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
      return data.value;
    };
    client.addRoute({route, act, handler});

    await client._routing({mes, route: mes.route, act: mes.act, data: mes.data, raw: mes, ws});

    expect(mes.data.str).toEqual('fn1fn2fn3');
    expect(mes.data.value).toEqual('12345');
    expect(mes.data.execCount).toEqual(0);

  });

  test('routing, fn1fn2fn3, route bike, execCount 2', async () => {

    const client = new Client({});

    const mes = {
      route: 'bike',
      act: 'stop',
      data: {
        str: '',
        value: null,
        execCount: 0
      }
    }

    const fn1 = ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn1';
    };

    const fn2 = ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn2';
    };

    const fn3 = async ({ws, mes, stop, raw}) => {
      mes.data.str += 'fn3';
    };

    client.use(fn1);
    client.use(fn2);
    client.use(fn3);

    let route = '';
    let act = '';
    let handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'empty route';
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
      stop();
    };
    client.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
      return data.value;
    };
    client.addRoute({route, act, handler});

    await client._routing({mes, route: mes.route, act: mes.act, data: mes.data, raw: mes, ws});

    expect(mes.data.str).toEqual('fn1fn2fn3');
    expect(mes.data.value).toEqual('route bike');
    expect(mes.data.execCount).toEqual(2);

  });

});

// URL

describe('url', () => {

  test('addUrl empty', () => {

    const client = new Client({});

    client.addUrl();

    expect(client.urls.size).toEqual(0);

  });

  test('addUrl 127.0.0.1:3000', () => {

    const client = new Client({});

    client.addUrl('127.0.0.1:3000');
    client.addUrl('127.0.0.1:3000');

    expect(client.urls.size).toEqual(1);
    expect(client.urls.has('127.0.0.1:3000')).toBeTruthy();

  });

  test('addUrl [127.0.0.1:3000, 127.0.0.1:3001, 127.0.0.1:3002]', () => {

    const client = new Client({});

    const urls = ['127.0.0.1:3000', '127.0.0.1:3001', '127.0.0.1:3002'];
    client.addUrl(urls);

    expect(client.urls.size).toEqual(3);
    expect(client.url).toEqual('127.0.0.1:3000');
    expect(client.urls.has('127.0.0.1:3000')).toBeTruthy();
    expect(client.urls.has('127.0.0.1:3001')).toBeTruthy();
    expect(client.urls.has('127.0.0.1:3002')).toBeTruthy();

  });

  test('nextUrl 127.0.0.1:3001', () => {

    const client = new Client({});

    const urls = ['127.0.0.1:3000', '127.0.0.1:3001', '127.0.0.1:3002'];
    client.addUrl(urls);
    client.nextUrl();

    expect(client.urls.size).toEqual(3);
    expect(client.url).toEqual('127.0.0.1:3001');
    expect(client.urls.has('127.0.0.1:3000')).toBeTruthy();
    expect(client.urls.has('127.0.0.1:3001')).toBeTruthy();
    expect(client.urls.has('127.0.0.1:3002')).toBeTruthy();

  });

  test('nextUrl 127.0.0.1:3002', () => {

    const client = new Client({});

    const urls = ['127.0.0.1:3000', '127.0.0.1:3001', '127.0.0.1:3002'];
    client.addUrl(urls);
    client.nextUrl();
    client.nextUrl();

    expect(client.urls.size).toEqual(3);
    expect(client.url).toEqual('127.0.0.1:3002');
    expect(client.urls.has('127.0.0.1:3000')).toBeTruthy();
    expect(client.urls.has('127.0.0.1:3001')).toBeTruthy();
    expect(client.urls.has('127.0.0.1:3002')).toBeTruthy();

  });

  test('nextUrl 127.0.0.1:3000', () => {

    const client = new Client({});

    const urls = ['127.0.0.1:3000', '127.0.0.1:3001', '127.0.0.1:3002'];
    client.addUrl(urls);
    client.nextUrl();
    client.nextUrl();
    client.nextUrl();

    expect(client.urls.size).toEqual(3);
    expect(client.url).toEqual('127.0.0.1:3000');
    expect(client.urls.has('127.0.0.1:3000')).toBeTruthy();
    expect(client.urls.has('127.0.0.1:3001')).toBeTruthy();
    expect(client.urls.has('127.0.0.1:3002')).toBeTruthy();

  });

  test('deleteUrl 127.0.0.1:3000', () => {

    const client = new Client({});

    const urls = ['127.0.0.1:3000', '127.0.0.1:3001', '127.0.0.1:3002'];
    client.addUrl(urls);
    client.deleteUrl('127.0.0.1:3000');

    expect(client.urls.size).toEqual(2);
    expect(client.urls.has('127.0.0.1:3001')).toBeTruthy();
    expect(client.urls.has('127.0.0.1:3002')).toBeTruthy();

  });

  test('deleteUrl [127.0.0.1:3000, 127.0.0.1:3001]', () => {

    const client = new Client({});

    const urls = ['127.0.0.1:3000', '127.0.0.1:3001', '127.0.0.1:3002'];
    client.addUrl(urls);
    client.deleteUrl(['127.0.0.1:3000', '127.0.0.1:3001']);

    expect(client.urls.size).toEqual(1);
    expect(client.urls.has('127.0.0.1:3002')).toBeTruthy();

  });

  test('deleteUrl all urls', () => {

    const client = new Client({});

    const urls = ['127.0.0.1:3000', '127.0.0.1:3001', '127.0.0.1:3002'];
    client.addUrl(urls);
    client.deleteUrl();

    expect(client.urls.size).toEqual(0);

  });

});

// WS

describe('WS', () => {

  test('_initWS no clone', () => {

    const client = new Client({isClone: false});

    const res = client._initWS({socket});

    expect(res.clone).toBeFalsy();

  });

  test('_initWS is clone', () => {

    const client = new Client({isClone: true});

    const res = client._initWS({socket});

    expect(res.clone).toBeTruthy();

  });

  test('sendMes', async () => {

    const client = new Client({});

    let value = null;

    client.ws = ws;
    ws.sendMes = async (parmas) => value = parmas.value;

    await client.sendMes({value: true});

    expect(value).toBeTruthy();

  });

});

// GROUPS

describe('groups', () => {

  test('subscribe group empty', async () => {

    const client = new Client({});

    let error;
    try {
      await client.subscribe({});
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('id group empty');

  });

  test('subscribe group sky', async () => {

    const client = new Client({});

    client.ws = ws;
    ws.sendMes = async (mes) => true;
    const res = await client.subscribe({id: 'sky'});

    expect(res).toBeTruthy();

  });

  test('subscribe group sky filed subscribe', async () => {

    const client = new Client({});

    client.ws = ws;
    ws.sendMes = async (mes) => false;

    let error;
    try {
      const res = await client.subscribe({id: 'sky'});
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('Failed to subscribe: sky');

  });

  test('unsubscribe group empty', async () => {

    const client = new Client({});

    let error;
    try {
      await client.unsubscribe({});
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('id group empty');

  });

  test('unsubscribe group sky', async () => {

    const client = new Client({});

    client.ws = ws;
    ws.sendMes = async (mes) => true;
    const res = await client.unsubscribe({id: 'sky'});

    expect(res).toBeTruthy();

  });

  test('unsubscribe group sky filed unsubscribe', async () => {

    const client = new Client({});

    client.ws = ws;
    ws.sendMes = async (mes) => false;

    let error;
    try {
      const res = await client.unsubscribe({id: 'sky'});
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('Failed to unsubscribe: sky');

  });

  test('getMyGroups server active', async () => {

    const client = new Client({});

    client.active = true;
    client.ws = ws;
    ws.sendMes = async (mes) => ['rick', 'morty'];
    const res = await client.getMyGroups();

    expect(res).toMatchObject(['rick', 'morty']);

  });

  test('getMyGroups server no active', async () => {

    const client = new Client({});

    client.groups.add('rick');
    client.groups.add('rick');
    client.groups.add('morty');
    const res = await client.getMyGroups();

    expect(res).toMatchObject(['rick', 'morty']);

  });

  test('getMyGroups failed server active', async () => {

    const client = new Client({});

    client.active = true;
    client.ws = ws;
    ws.sendMes = async (mes) => false;

    let error;
    try {
      const res = await client.getMyGroups();
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('Failed to get my groups');

  });

  test('sendMesToGroup', async () => {

    const client = new Client({});

    client.ws = ws;
    ws.sendMes = async (mes) => true;
    const res = await client.sendMesToGroup({});

    expect(res).toBeTruthy();

  });

  test('sendMesToGroup failed', async () => {

    const client = new Client({});

    client.ws = ws;
    ws.sendMes = async (mes) => false;

    let error;
    try {
      const res = await client.sendMesToGroup({id: '12345'});
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('Failed send mes to: 12345');

  });

});

// START and STOP

describe('other', () => {

  test('stop', () => {

    const client = new Client({});
    client.socket = socket;
    socket.close = (cb) => cb();

    const data = {cb: false, emitStop: false};
    const cb = () => data.cb = true;

    client.reconnect = true;
    client.on('stop', () => data.emitStop = true);
    client.stop({cb});

    expect(client.reconnect).toBeFalsy();
    expect(data.cb).toBeTruthy();
    expect(data.emitStop).toBeTruthy();

  });

  test('getInfo', () => {

    const params = {
      id: 'id',
      url: 'url',
      attempts: 3,
      awaitCycleTimeout: 100,
      reconnectTimeout: 1000,
      data: {
        name: 'name'
      }
    };

    const client = new Client(params);

    const res = client.getInfo();

    delete params.reconnectTimeout;
    delete params.awaitCycleTimeout;
    params.timeouts = {reconnect: 1000, awaitRes: 10000, awaitCycle: 100};

    expect(res).toMatchObject(params);

  });

  test('reconnectWS readyState 1', () => {

    const client = new Client({});

    socket.readyState = 1;
    client.socket = socket;

    client.reconnectWs();

    expect(client.countAttempts).toEqual(0);

  });

  test('reconnectWS readyState 3', () => {

    const client = new Client({});

    socket.readyState = 3;
    client.socket = socket;

    let start = false;
    client.start = () => start = true;

    const urls = ['127.0.0.1:3000', '127.0.0.1:3001', '127.0.0.1:3002'];
    client.addUrl(urls);
    client.url = '127.0.0.1:3000';

    client.reconnectWs();

    expect(client.countAttempts).toEqual(1);
    expect(client.url).toEqual('127.0.0.1:3001');
    expect(start).toBeTruthy();

  });

  test('start', () => {

    const client = new Client({id: 'testClient'});

    const params = {
      url: '127.0.0.1:4000',
      reconnect: false,
      reconnectTimeout: 1000,
      attempts: 3
    };

    client.start(params);

    expect(client.url).toEqual('127.0.0.1:4000');
    expect(client.attempts).toEqual(3);
    expect(client.reconnect).toBeFalsy();
    expect(client.timeouts.reconnect).toEqual(1000);

  });

  test('start onopen', async () => {

    const client = new Client({id: 'testClient', isClone: true});

    let auth = false;
    client._authClone = async () => auth = true;
    client.countAttempts = 2;
    client.active = false;

    const params = {
      url: '127.0.0.1:4000',
      reconnect: false,
      reconnectTimeout: 1000,
      attempts: 3
    };

    client.start(params);
    await client.socket.onopen();

    expect(client.url).toEqual('127.0.0.1:4000');
    expect(client.attempts).toEqual(3);
    expect(client.reconnect).toBeFalsy();
    expect(client.timeouts.reconnect).toEqual(1000);
    expect(auth).toBeTruthy();
    expect(client.countAttempts).toEqual(0);
    expect(client.active).toBeTruthy();

  });

  test('start onclose no attempts', async () => {

    const client = new Client({id: 'testClient', isClone: true});

    let auth = false;
    let stop = false;
    client._authClone = async () => auth = true;
    client.active = true;
    client.stop = () => stop = true;

    const params = {
      url: '127.0.0.1:4000',
      reconnect: false,
      reconnectTimeout: 1000,
      attempts: 3
    };

    client.start(params);

    await client.socket.onopen();
    client.countAttempts = 3;
    await client.socket.onclose();

    expect(client.url).toEqual('127.0.0.1:4000');
    expect(client.attempts).toEqual(3);
    expect(client.reconnect).toBeFalsy();
    expect(client.timeouts.reconnect).toEqual(1000);
    expect(auth).toBeTruthy();
    expect(client.countAttempts).toEqual(3);
    expect(client.active).toBeFalsy();
    expect(stop).toBeTruthy();

  });

  test('start onclose with attempts', async (done) => {

    const client = new Client({id: 'testClient'});

    client.active = true;

    client.stop = () => {
      expect(client.url).toEqual('127.0.0.1:4000');
      expect(client.attempts).toEqual(3);
      expect(client.reconnect).toBeTruthy();
      expect(client.timeouts.reconnect).toEqual(10);
      expect(client.countAttempts).toEqual(3);
      expect(client.active).toBeFalsy();
      done();
    };

    const params = {
      url: '127.0.0.1:4000',
      reconnect: true,
      reconnectTimeout: 10,
      attempts: 3
    };

    client.start(params);

    await client.socket.onopen();

    client.countAttempts = 2;

    client.reconnectWs = () => {
      client.countAttempts++;
      client.socket.onclose();
    };

    await client.socket.onclose();

  });

  test('start onmessage', async (done) => {

    const client = new Client({id: 'testClient'});

    const params = {
      url: '127.0.0.1:4000',
      reconnect: false,
      reconnectTimeout: 1000,
      attempts: 3
    };

    client.start(params);
    client.ws = true;

    const message = {
      systemInfo: 'systemInfo',
      data: JSON.stringify({
        route: 'route',
        act: 'act',
        data: 'data',
        type: 'message'
      })
    };

    client._routing = async ({mes, route, act, data, raw, ws}) => {
      expect(mes).toMatchObject(JSON.parse(message.data));
      expect(route).toEqual('route');
      expect(act).toEqual('act');
      expect(data).toEqual('data');
      expect(raw).toMatchObject(message);
      expect(ws).toBeTruthy();
      done();
    };

    await client.socket.onmessage(message);

  });

});