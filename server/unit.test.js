const Server = require('./server');
const Groups = require('./groups/groups');
const Clones = require('./clones/clones');
const WS = require('../common/ws/ws');

const WebSocket = require('ws');
jest.mock('ws');
WebSocket.Server.mockImplementation((opts) => {

  return {
    id: 'WebSocket',
    opts,
    events: {},
    on(event, handler) {
      this.events[event] = handler;
    },
    close(cb) {
      cb();
    }
  };

});

const ws = {
  sendMes: async function () {

  },
  fillRes() {

  }
};

describe('constructor', () => {

  test('default params', () => {

    const server = new Server();

    expect(server.wss).toBeNull();
    expect(server.id).not.toBeNull();
    expect(server.id).not.toBeUndefined();
    expect(server.port).toEqual(3000);
    expect(server.active).toBeFalsy();
    expect(server.data).toMatchObject({});
    expect(server.authFnIn).toBeUndefined();
    expect(server.authFnOut).toBeUndefined();
    expect(server.routes.size).toEqual(0);
    expect(server.groups).toBeInstanceOf(Groups);
    expect(server._systemRoutes.size).toEqual(7);
    expect(server._middlewares.length).toEqual(0);
    expect(server.clients).toMatchObject({});
    expect(server.clones).toBeInstanceOf(Clones);
    expect(server.timeouts.clearOfflineClients).toEqual(1000 * 30);
    expect(server._clearOfflineClientsId).toBeNull();

  });

  test('set params', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    expect(server.wss).toBeNull();
    expect(server.id).toEqual('road60');
    expect(server.port).toEqual(4000);
    expect(server.active).toBeFalsy();
    expect(server.data).toMatchObject(data);
    expect(typeof server.authFnIn).toEqual('function');
    expect(typeof server.authFnOut).toEqual('function');
    expect(server.routes.size).toEqual(0);
    expect(server.groups).toBeInstanceOf(Groups);
    expect(server._systemRoutes.size).toEqual(7);
    expect(server._middlewares.length).toEqual(0);
    expect(server.clients).toMatchObject({});
    expect(server.clones).toBeInstanceOf(Clones);
    expect(server.timeouts.clearOfflineClients).toEqual(1000 * 30);
    expect(server._clearOfflineClientsId).toBeNull();

  });

});

describe('start', () => {

  test('without opts', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    let execClonesStart = false;
    server.clones.start = () => execClonesStart = true;

    let execStartClearOfflineClients = false;
    server._startClearOfflineClients = () => execStartClearOfflineClients = true;

    server.start();

    expect(server.wss.id).toEqual('WebSocket');
    expect(server.active).toBeTruthy();
    expect(typeof server.wss.events.connection).toEqual('function');
    expect(execClonesStart).toBeTruthy();
    expect(execStartClearOfflineClients).toBeTruthy();

  });

  test('with opts', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    let execClonesStart = false;
    server.clones.start = () => execClonesStart = true;

    let execStartClearOfflineClients = false;
    server._startClearOfflineClients = () => execStartClearOfflineClients = true;

    server.start({port: 3000});

    expect(server.wss.id).toEqual('WebSocket');
    expect(server.wss.opts.port).toEqual(3000);
    expect(server.active).toBeTruthy();
    expect(typeof server.wss.events.connection).toEqual('function');
    expect(execClonesStart).toBeTruthy();
    expect(execStartClearOfflineClients).toBeTruthy();

  });

});

describe('stop', () => {

  test('stop', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    server.active = true;

    let execClonesStop = false
    server.clones.stop = () => execClonesStop = true;

    let execCb = false;
    const cb = () => execCb = true;

    server.wss = new WebSocket.Server();

    server.stop({cb});

    expect(server.active).toBeFalsy();
    expect(execClonesStop).toBeTruthy();
    expect(execCb).toBeTruthy();

  });

});

describe('middlewares', () => {

  test('use fn not function', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    let error;
    try {
      server.use('not function');
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('Middleware type is not a function');

  });

  test('use fn', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

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

    server.use(fn1);
    server.use(fn2);
    server.use(fn3);

    expect(server._middlewares[0]).toEqual(fn1);
    expect(server._middlewares[1]).toEqual(fn2);
    expect(server._middlewares[2]).toEqual(fn3);

  });

  test('_execMiddlewares return false', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

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

    server.use(fn1);
    server.use(fn2);
    server.use(fn3);

    const res = await server._execMiddlewares({mes, raw: mes});

    expect(mes.data.str).toEqual('fn1fn2fn3');
    expect(res).toBeFalsy();

  });

  test('_execMiddlewares return true', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

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

    server.use(fn1);
    server.use(fn2);
    server.use(fn3);

    const res = await server._execMiddlewares({mes, raw: mes});

    expect(mes.data.str).toEqual('fn1fn2');
    expect(res).toBeTruthy();

  });

});

describe('routing', () => {

  test('Add route Handler not function', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    let msg = null;
    const message = 'The handler must be a function';
    const handler = {};

    try {
      const route = server.addRoute({handler});
    } catch (e) {
      msg = e.message;
    }

    expect(msg).toEqual(message);

  });

  test('Add route valid values', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    const act = 'act';
    const handler = () => {
    };

    server.addRoute({route: 'route', act, handler});
    const routes = Array.from(server.routes);
    const route = routes[0];

    expect(route.route).toEqual('route');
    expect(route.act).toEqual('act');
    expect(route.handler).toEqual(handler);

  });

  test('_execRoutes, route: empty, act: empty', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

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
    server.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
    };
    server.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
    };
    server.addRoute({route, act, handler});

    await server._execRoutes({ws, route: mes.route, act: mes.act, data: mes.data, mes});

    expect(mes.data.execCount).toEqual(1);
    expect(mes.data.value).toEqual('empty route');

  });

  test('_execRoutes, route: bike, act: empty', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

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
    server.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
    };
    server.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
    };
    server.addRoute({route, act, handler});

    await server._execRoutes({ws, route: mes.route, act: mes.act, data: mes.data, mes});

    expect(mes.data.execCount).toEqual(2);
    expect(mes.data.value).toEqual('route bike');

  });

  test('_execRoutes, route: bike, act: stop', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

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
    server.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
    };
    server.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
    };
    server.addRoute({route, act, handler});

    await server._execRoutes({ws, route: mes.route, act: mes.act, data: mes.data, mes});

    expect(mes.data.execCount).toEqual(3);
    expect(mes.data.value).toEqual('route bike, act stop');

  });

  test('_execRoutes, route: bike, act: stop, handler stop', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

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
    server.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
      stop();
    };
    server.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
    };
    server.addRoute({route, act, handler});

    await server._execRoutes({ws, route: mes.route, act: mes.act, data: mes.data, mes});

    expect(mes.data.execCount).toEqual(2);
    expect(mes.data.value).toEqual('route bike');

  });

  test('_execRoutes, route: bike, act: stop, async handler, handler stop', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

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
    server.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = async ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
      stop();
    };
    server.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = async ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
    };
    server.addRoute({route, act, handler});

    await server._execRoutes({ws, route: mes.route, act: mes.act, data: mes.data, mes});

    expect(mes.data.execCount).toEqual(2);
    expect(mes.data.value).toEqual('route bike');

  });

  test('_execRoutes, route: bike, act: stop, awaitRes', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

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
    server.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
    };
    server.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
      return data.value;
    };
    server.addRoute({route, act, handler});

    await server._execRoutes({ws, route: mes.route, act: mes.act, data: mes.data, mes});

    expect(awaitRes.data).toEqual('route bike, act stop');
    expect(awaitRes.idMesAwaitRes).toEqual('12345');

    expect(mes.data.execCount).toEqual(3);
    expect(mes.data.value).toEqual('route bike, act stop');

  });

  test('_processAwaitRes, return false', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    const mes = {
      system: {
        idMesAwaitRes: null
      }
    };

    const res = server._processAwaitRes({ws, mes});

    expect(res).toBeFalsy();

  });

  test('_processAwaitRes, return true', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    const mes = {
      system: {
        idMesAwaitRes: '12345'
      },
      data: {
        value: false
      }
    };

    ws.fillRes = ({id, res}) => res.value = id;

    const res = server._processAwaitRes({ws, mes});

    expect(res).toBeTruthy();
    expect(mes.data.value).toEqual('12345');

  });

  test('routing, fn1fn2fn3, route bike, act stop, execCount 3', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

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

    server.use(fn1);
    server.use(fn2);
    server.use(fn3);

    let route = '';
    let act = '';
    let handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'empty route';
    };
    server.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
    };
    server.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
      return data.value;
    };
    server.addRoute({route, act, handler});

    await server._routing({mes, route: mes.route, act: mes.act, data: mes.data, raw: mes, ws});

    expect(mes.data.str).toEqual('fn1fn2fn3');
    expect(mes.data.value).toEqual('route bike, act stop');
    expect(mes.data.execCount).toEqual(3);

  });

  test('routing, fn1fn2, null, execCount 0', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

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

    server.use(fn1);
    server.use(fn2);
    server.use(fn3);

    let route = '';
    let act = '';
    let handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'empty route';
    };
    server.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
    };
    server.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
      return data.value;
    };
    server.addRoute({route, act, handler});

    await server._routing({mes, route: mes.route, act: mes.act, data: mes.data, raw: mes, ws});

    expect(mes.data.str).toEqual('fn1fn2');
    expect(mes.data.value).toBeNull();
    expect(mes.data.execCount).toEqual(0);

  });

  test('routing, fn1fn2fn3, null, execCount 0', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

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

    server.use(fn1);
    server.use(fn2);
    server.use(fn3);

    let route = '';
    let act = '';
    let handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'empty route';
    };
    server.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
    };
    server.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
      return data.value;
    };
    server.addRoute({route, act, handler});

    await server._routing({mes, route: mes.route, act: mes.act, data: mes.data, raw: mes, ws});

    expect(mes.data.str).toEqual('fn1fn2fn3');
    expect(mes.data.value).toEqual('12345');
    expect(mes.data.execCount).toEqual(0);

  });

  test('routing, fn1fn2fn3, route bike, execCount 2', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

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

    server.use(fn1);
    server.use(fn2);
    server.use(fn3);

    let route = '';
    let act = '';
    let handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'empty route';
    };
    server.addRoute({route, act, handler});

    route = 'bike';
    act = '';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike';
      stop();
    };
    server.addRoute({route, act, handler});

    route = 'bike';
    act = 'stop';
    handler = ({ws, data, stop}) => {
      data.execCount++;
      data.value = 'route bike, act stop';
      return data.value;
    };
    server.addRoute({route, act, handler});

    await server._routing({mes, route: mes.route, act: mes.act, data: mes.data, raw: mes, ws});

    expect(mes.data.str).toEqual('fn1fn2fn3');
    expect(mes.data.value).toEqual('route bike');
    expect(mes.data.execCount).toEqual(2);

  });

  test('_systemRouting stop', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    let execRoutes = false;
    server._execRoutes = async () => execRoutes = true;
    server._processAwaitRes = () => true;

    await server._systemRouting({});

    expect(execRoutes).toBeFalsy();

  });

  test('_systemRouting stop', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    let execRoutes = false;
    server._execRoutes = async () => execRoutes = true;
    server._processAwaitRes = () => false;

    await server._systemRouting({});

    expect(execRoutes).toBeTruthy();

  });

});

describe('clones', () => {

  test('add clone without authFnOut', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});
    server.authFnOut = 'authFnOutServer';

    const clone = {
      id: 'clone',
      url: 'url'
    };

    const clones = [];

    server.clones.add = ({id, url, authFnOut}) => {
      clones.push({id, url, authFnOut});
    };

    server.addClone(clone);

    expect(clones).toMatchObject([{id: 'clone', url: 'url', authFnOut: 'authFnOutServer'}]);

  });

  test('add clone with authFnOut', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});
    server.authFnOut = 'authFnOutServer';

    const clone = {
      id: 'clone',
      url: 'url',
      authFnOut: 'authFnOutClient'
    };

    const clones = [];

    server.clones.add = ({id, url, authFnOut}) => {
      clones.push({id, url, authFnOut});
    };

    server.addClone(clone);

    expect(clones).toMatchObject([{id: 'clone', url: 'url', authFnOut: 'authFnOutClient'}]);

  });

  test('delete clone', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});
    server.authFnOut = 'authFnOutServer';

    let deletedClone = null;
    server.clones.delete = ({id}) => {
      deletedClone = id;
    };

    server.deleteClone({id: 'rick'});

    expect(deletedClone).toEqual('rick');

  });

});

describe('clients', () => {

  test('clearOfflineClients', async (done) => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    const client1 = {
      id: 'client1',
      socket: {
        readyState: 0
      }
    };

    const client2 = {
      id: 'client2',
      socket: {
        readyState: 1
      }
    };

    const client3 = {
      id: 'client3',
      socket: {
        readyState: 2
      }
    };

    const client4 = {
      id: 'client4'
    };

    const deleted = [];
    server.clients = {client1, client2, client3, client4};
    server._deleteClient = ({ws}) => {
      deleted.push(ws);
      expect(deleted).toMatchObject([client3]);
      done();
    };

    await server.clearOfflineClients();

  });

  test('_initWS', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    const socket = {};
    const ws = server._initWS({socket});

    expect(ws).toBeInstanceOf(WS);

  });

  test('_connection', async () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    const socket = {
      events: {},
      on(event, handler) {
        this.events[event] = handler;
      }
    };

    let execAddClient = false;
    server._addClient = () => execAddClient = true;

    let execRouting = false;
    server._routing = () => execRouting = true;

    let execSystemRouting = false;
    server._systemRouting = () => execSystemRouting = true;

    server._connection(socket);

    const systemMes = {
      data: JSON.stringify({
        route: 'route',
        act: 'act',
        data: {},
        type: 'system'
      })
    };

    const mes = {
      data: JSON.stringify({
        route: 'route',
        act: 'act',
        data: {},
        type: 'message'
      })
    };

    await socket.onmessage(mes);
    await socket.onmessage(systemMes);

    expect(execAddClient).toBeTruthy();
    expect(execRouting).toBeTruthy();
    expect(execSystemRouting).toBeTruthy();

  });

  test('_addClient', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    const client = {id: 'client'};
    server._addClient(client);

    expect(server.clients.client).toMatchObject({id: 'client'});

  });

  test('_deleteClient ws', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    let execStop = false;
    const client = {
      id: 'client',
      stop() {
        execStop = true;
      }
    };

    server.clients = {client};

    let execDeleteSubscriber = false;
    server.groups.deleteSubscriber = () => execDeleteSubscriber = true;

    let execDelete = false;
    server.wss = {clients: {}};
    server.wss.clients.delete = () => execDelete = true;

    server._deleteClient({ws: client});

    expect(execStop).toBeTruthy();
    expect(execDeleteSubscriber).toBeTruthy();
    expect(execDelete).toBeTruthy();
    expect(server.clients.client).toBeUndefined();

  });

  test('_deleteClient id', () => {

    const id = 'road60';
    const port = 4000;
    const data = {description: 'road 60 and road 66'};
    const authFnIn = () => {
    };
    const authFnOut = () => {
    };
    const server = new Server({id, port, data, authFnIn, authFnOut});

    let execStop = false;
    const client = {
      id: 'client',
      stop() {
        execStop = true;
      }
    };

    server.clients = {client};

    let execDeleteSubscriber = false;
    server.groups.deleteSubscriber = () => execDeleteSubscriber = true;

    let execDelete = false;
    server.wss = {clients: {}};
    server.wss.clients.delete = () => execDelete = true;

    server._deleteClient({id: 'client'});

    expect(execStop).toBeTruthy();
    expect(execDeleteSubscriber).toBeTruthy();
    expect(execDelete).toBeTruthy();
    expect(server.clients.client).toBeUndefined();

  });

  test('_startClearOfflineClients', (done) => {

    const server = new Server();
    server.timeouts.clearOfflineClients = 10;
    server._clearOfflineClientsId = setInterval(() => {
    }, 1000);

    let count = 0;

    server.clearOfflineClients = async () => {
      count++;
      if (count < 3) return;
      done();
    };

    server._startClearOfflineClients();

  });

});