const Clone = require('./clones');
const Client = require('../../client/backendClient');
jest.mock('../../client/backendClient');
Client.mockImplementation(({id, url, authFnOut, isClone = true}) => {

  authFnOut();

  return {
    id, url, authFnOut, isClone,
    getInfo() {
      return {id, url, isClone};
    },
    events: {},
    on(event, handler) {
      this.events[event] = handler;
    }
  }

});

describe('constructor', () => {

  test('constructor default', () => {

    const clone = new Clone();

    const cache = {
      id: {},
      url: {},
      active: {}
    };

    expect(clone.server).toMatchObject({});
    expect(clone.interval).toEqual(5000);
    expect(clone.cache).toMatchObject(cache);
    expect(clone._idGetRemoteClones).toBeNull();
    expect(clone.clones.size).toEqual(0);

  });

  test('constructor setup', () => {

    const server = {id: 'server', description: 'server'};
    const interval = 1000;
    const clone = new Clone({server, interval});

    const cache = {
      id: {},
      url: {},
      active: {}
    };

    expect(clone.server).toMatchObject(server);
    expect(clone.interval).toEqual(1000);
    expect(clone.cache).toMatchObject(cache);
    expect(clone._idGetRemoteClones).toBeNull();
    expect(clone.clones.size).toEqual(0);

  });

});

describe('cache', () => {

  test('_cloneInCache no in cache', () => {

    const clone = new Clone();

    const rick = {id: 'rick', url: 'space.rk'};
    const morty = {id: 'morty', url: 'morty.my'};

    clone.cache.id = {rick, morty};
    clone.cache.url = {'space.rk': rick, 'morty.my': morty};

    const res = clone._cloneInCache({id: 'sandy', url: 'space.sy'});

    expect(res).toBeUndefined();

  });

  test('_cloneInCache in cache url and id', () => {

    const clone = new Clone();

    const rick = {id: 'rick', url: 'space.rk'};
    const morty = {id: 'morty', url: 'morty.my'};

    clone.cache.id = {rick, morty};
    clone.cache.url = {'space.rk': rick, 'morty.my': morty};

    const res = clone._cloneInCache(rick);

    expect(res).toMatchObject(rick);

  });

  test('_cloneInCache in cache url', () => {

    const clone = new Clone();

    const rick = {id: 'rick', url: 'space.rk'};
    const morty = {id: 'morty', url: 'morty.my'};

    clone.cache.id = {rick, morty};
    clone.cache.url = {'space.rk': rick, 'morty.my': morty};

    const res = clone._cloneInCache({url: rick.url});

    expect(res).toMatchObject(rick);

  });

  test('_cloneInCache in cache id', () => {

    const clone = new Clone();

    const rick = {id: 'rick', url: 'space.rk'};
    const morty = {id: 'morty', url: 'morty.my'};

    clone.cache.id = {rick, morty};
    clone.cache.url = {'space.rk': rick, 'morty.my': morty};

    const res = clone._cloneInCache({id: rick.id});

    expect(res).toMatchObject(rick);

  });

  test('_addCloneInCache in cache', () => {

    const clone = new Clone();

    const rick = {
      id: 'rick',
      url: 'space.rk',
      getInfo() {
        return this;
      }
    };

    const morty = {
      id: 'morty',
      url: 'morty.my',
      getInfo() {
        return this;
      }
    };

    clone._addCloneInCache(rick);
    clone._addCloneInCache(morty);

    const resRick = clone._cloneInCache({id: 'rick'});
    const resMorty = clone._cloneInCache({url: 'morty.my'});

    expect(resRick).toMatchObject(rick);
    expect(resMorty).toMatchObject(morty);

  });

  test('_deleteCloneInCache in cache', () => {

    const clone = new Clone();

    const rick = {
      id: 'rick',
      url: 'space.rk',
      getInfo() {
        return this;
      }
    };

    const morty = {
      id: 'morty',
      url: 'morty.my',
      getInfo() {
        return this;
      }
    };

    clone._addCloneInCache(rick);
    clone._addCloneInCache(morty);
    clone._deleteCloneInCache(rick);

    const resRick = clone._cloneInCache({id: 'rick'});
    const resMorty = clone._cloneInCache({url: 'morty.my'});

    expect(resRick).toBeUndefined();
    expect(resMorty).toMatchObject(morty);

  });

  test('_updateCacheActive two active', () => {

    const clone = new Clone();

    const rick = {
      id: 'rick',
      url: 'space.rk',
      active: true,
      getInfo() {
        return this;
      }
    };

    const morty = {
      id: 'morty',
      url: 'morty.my',
      active: true,
      getInfo() {
        return this;
      }
    };

    clone._updateCacheActive(rick);
    clone._updateCacheActive(morty);

    const resRick = clone.cache.active.rick;
    const resMorty = clone.cache.active.morty;

    expect(resRick).toMatchObject(rick);
    expect(resMorty).toMatchObject(morty);

  });

  test('_updateCacheActive one active', () => {

    const clone = new Clone();

    const rick = {
      id: 'rick',
      url: 'space.rk',
      active: true,
      getInfo() {
        return this;
      }
    };

    const morty = {
      id: 'morty',
      url: 'morty.my',
      active: true,
      getInfo() {
        return this;
      }
    };

    clone._updateCacheActive(rick);
    clone._updateCacheActive(morty);

    rick.active = false;
    clone._updateCacheActive(rick);

    const resRick = clone.cache.active.rick;
    const resMorty = clone.cache.active.morty;

    expect(resRick).toBeUndefined();
    expect(resMorty).toMatchObject(morty);

  });

});

describe('get', () => {

  test('get all', () => {

    const clone = new Clone();

    const rick = {
      id: 'rick',
      url: 'space.rk',
      active: true,
      getInfo() {
        return this;
      }
    };

    const morty = {
      id: 'morty',
      url: 'morty.my',
      active: false,
      getInfo() {
        return this;
      }
    };

    clone._addCloneInCache(rick);
    clone._addCloneInCache(morty);

    const res = clone.get();

    expect(res).toMatchObject([rick, morty]);

  });

  test('get id', () => {

    const clone = new Clone();

    const rick = {
      id: 'rick',
      url: 'space.rk',
      active: true,
      getInfo() {
        return this;
      }
    };

    const morty = {
      id: 'morty',
      url: 'morty.my',
      active: false,
      getInfo() {
        return this;
      }
    };

    clone._addCloneInCache(rick);
    clone._addCloneInCache(morty);

    const res = clone.get({id: 'rick'});

    expect(res).toMatchObject(rick);

  });

  test('get url', () => {

    const clone = new Clone();

    const rick = {
      id: 'rick',
      url: 'space.rk',
      active: true,
      getInfo() {
        return this;
      }
    };

    const morty = {
      id: 'morty',
      url: 'morty.my',
      active: false,
      getInfo() {
        return this;
      }
    };

    clone._addCloneInCache(rick);
    clone._addCloneInCache(morty);

    const res = clone.get({url: 'space.rk'});

    expect(res).toMatchObject(rick);

  });

  test('get active', () => {

    const clone = new Clone();

    const rick = {
      id: 'rick',
      url: 'space.rk',
      active: true,
      getInfo() {
        return this;
      }
    };

    const morty = {
      id: 'morty',
      url: 'morty.my',
      active: false,
      getInfo() {
        return this;
      }
    };

    clone._addCloneInCache(rick);
    clone._addCloneInCache(morty);
    clone._updateCacheActive(rick);
    clone._updateCacheActive(morty);

    const res = clone.get({active: true});

    expect(res).toMatchObject([rick]);

  });

});

describe('add', () => {

  test('add is me', () => {

    const server = {id: 'rick'};
    const clone = new Clone({server});

    let error;
    try {
      clone.add({id: 'rick', url: 'space.rk'});
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('Clone cannot add yourself id: rick; url: space.rk');

  });

  test('add clone update clone', () => {

    const server = {id: 'rick', active: true};
    const clone = new Clone({server});

    const rick = {
      id: 'rick',
      url: 'space.rk',
      active: true,
      getInfo() {
        return this;
      }
    };

    let start = false;
    let stop = false;
    const morty = {
      id: 'morty',
      url: 'space.my',
      active: false,
      getInfo() {
        return this;
      },
      start() {
        start = true;
      },
      stop() {
        stop = true;
      }
    };

    const authFnOut = 'authFnOut';
    clone._addCloneInCache(morty);
    clone.clones.get = () => morty;

    clone.add({id: 'morty', url: 'space.my', authFnOut});

    expect(start).toBeTruthy();
    expect(stop).toBeTruthy();
    expect(morty.url).toEqual('space.my');

  });

  test('add clone update clone changed url server active', () => {

    const server = {id: 'rick', active: true};
    const clone = new Clone({server});

    const rick = {
      id: 'rick',
      url: 'space.rk',
      active: true,
      getInfo() {
        return this;
      }
    };

    let start = false;
    let stop = false;
    const morty = {
      id: 'morty',
      url: 'space.my',
      active: false,
      getInfo() {
        return this;
      },
      start() {
        start = true;
      },
      stop() {
        stop = true;
      }
    };

    const authFnOut = 'authFnOut';
    clone._addCloneInCache(morty);
    clone.clones.get = () => morty;

    clone.add({id: 'morty', url: 'space.xx', authFnOut});

    expect(start).toBeTruthy();
    expect(stop).toBeTruthy();
    expect(morty.url).toEqual('space.xx');
    expect(morty.authFnOut).toEqual('authFnOut');

  });

  test('add clone update clone changed url server not active', () => {

    const server = {id: 'rick', active: false};
    const clone = new Clone({server});

    const rick = {
      id: 'rick',
      url: 'space.rk',
      active: true,
      getInfo() {
        return this;
      }
    };

    let start = false;
    let stop = false;
    const morty = {
      id: 'morty',
      url: 'space.my',
      active: false,
      getInfo() {
        return this;
      },
      start() {
        start = true;
      },
      stop() {
        stop = true;
      }
    };

    const authFnOut = 'authFnOut';
    clone._addCloneInCache(morty);
    clone.clones.get = () => morty;

    clone.add({id: 'morty', url: 'space.xx', authFnOut});

    expect(start).toBeFalsy();
    expect(stop).toBeFalsy();
    expect(morty.url).toEqual('space.xx');
    expect(morty.authFnOut).toEqual('authFnOut');

  });

  test('add set authFnOut', () => {

    const server = {id: 'rick'};
    const clone = new Clone({server});

    let execAuthFnOut = false;
    const authFnOut = () => {
      execAuthFnOut = true;
      return execAuthFnOut;
    }

    clone.add({id: 'morty', url: 'space.my', authFnOut});

    const morty = clone.clones.get('morty');
    const info = morty.getInfo();

    expect(execAuthFnOut).toBeTruthy();
    expect(morty.id).toEqual('morty');
    expect(morty.url).toEqual('space.my');
    expect(morty.isClone).toBeTruthy();
    expect(typeof morty.authFnOut).toEqual('function');
    expect(typeof morty.events.open).toEqual('function');
    expect(typeof morty.events.close).toEqual('function');

    expect(info.id).toEqual('morty');
    expect(info.url).toEqual('space.my');
    expect(info.isClone).toBeTruthy();

  });

  test('add server authFnOut, server active', () => {

    let start = false;
    Client.mockClear();
    Client.mockImplementation(({id, url, authFnOut, isClone = true}) => {

      authFnOut();

      return {
        id, url, authFnOut, isClone,
        getInfo() {
          return {id, url, isClone};
        },
        events: {},
        on(event, handler) {
          this.events[event] = handler;
        },
        start() {
          start = true;
        }
      }

    });

    let execAuthFnOut = false;
    const authFnOut = () => {
      execAuthFnOut = true;
      return execAuthFnOut;
    }

    const server = {id: 'rick', active: true, authFnOut};
    const clone = new Clone({server});

    clone.add({id: 'morty', url: 'space.my'});

    const morty = clone.clones.get('morty');
    const info = morty.getInfo();

    expect(execAuthFnOut).toBeTruthy();
    expect(start).toBeTruthy();

    expect(morty.id).toEqual('morty');
    expect(morty.url).toEqual('space.my');
    expect(morty.isClone).toBeTruthy();
    expect(typeof morty.authFnOut).toEqual('function');
    expect(typeof morty.events.open).toEqual('function');
    expect(typeof morty.events.close).toEqual('function');

    expect(info.id).toEqual('morty');
    expect(info.url).toEqual('space.my');
    expect(info.isClone).toBeTruthy();

  });

});

describe('delete', () => {

  test('delete morty', () => {

    const clone = new Clone();

    const rick = {
      id: 'rick',
      url: 'space.rk',
      active: true,
      getInfo() {
        return this;
      }
    };

    let stop = false;
    const morty = {
      id: 'morty',
      url: 'morty.my',
      active: false,
      getInfo() {
        return this;
      },
      stop() {
        stop = true;
      }
    };

    clone.clones.set('rick', rick);
    clone.clones.set('morty', morty);
    clone._addCloneInCache(rick);
    clone._addCloneInCache(morty);

    clone.delete({id: 'morty'});

    expect(stop).toBeTruthy();
    expect(clone.clones.size).toEqual(1);
    expect(clone.clones.get('rick')).toMatchObject(rick);
    expect(clone.cache.id.morty).toBeUndefined();
    expect(clone.cache.url.morty).toBeUndefined();
    expect(clone.cache.active.morty).toBeUndefined();

  });

});

describe('start', () => {

  test('start', (done) => {

    const clone = new Clone({interval: 1});

    const rick = {
      id: 'rick',
      url: 'space.rk',
      active: true,
      execStart: false,
      getInfo() {
        return this;
      },
      start() {
        this.execStart = true;
      }
    };

    const morty = {
      id: 'morty',
      url: 'morty.my',
      active: false,
      execStart: false,
      getInfo() {
        return this;
      },
      start() {
        this.execStart = true;
      }
    };

    clone.clones.set('rick', rick);
    clone.clones.set('morty', morty);

    let execRemoteClones = false;
    clone.getRemoteClones = async () => {

      execRemoteClones = true;

      expect(clone._idGetRemoteClones).not.toBeNull();
      expect(rick.execStart).toBeFalsy();
      expect(morty.execStart).toBeTruthy();
      expect(execRemoteClones).toBeTruthy();
      done();

    }

    clone.start();

  });

});

describe('stop', () => {

  test('stop', (done) => {

    const clone = new Clone({interval: 1});

    const rick = {
      id: 'rick',
      url: 'space.rk',
      active: true,
      execStart: false,
      execStop: false,
      getInfo() {
        return this;
      },
      start() {
        this.execStart = true;
      },
      stop() {
        this.execStop = true;
      }
    };

    const morty = {
      id: 'morty',
      url: 'morty.my',
      active: false,
      execStart: false,
      execStop: false,
      getInfo() {
        return this;
      },
      start() {
        this.execStart = true;
      },
      stop() {
        this.execStop = true;
      }
    };

    clone.clones.set('rick', rick);
    clone.clones.set('morty', morty);

    let execRemoteClones = false;
    clone.getRemoteClones = async () => {

      execRemoteClones = true;

      expect(clone._idGetRemoteClones).not.toBeNull();
      expect(rick.execStart).toBeFalsy();
      expect(morty.execStart).toBeTruthy();
      expect(execRemoteClones).toBeTruthy();

      clone.stop();

      expect(clone._idGetRemoteClones).toBeNull();
      expect(rick.execStop).toBeTruthy();
      expect(morty.execStop).toBeFalsy();

      done();

    }

    clone.start();

  });

});

describe('updateClones', () => {

  const server = {
    id: 'rick',
    authFnOut: 'authFnOut'
  };

  const clone = new Clone({server});

  const rick = {
    id: 'rick',
    url: 'space.rk',
  };

  const morty = {
    id: 'morty',
    url: 'space.my',
  };

  const sandy = {
    id: 'sandy',
    url: 'space.sy',
  };

  clone.cache.id.sandy = 'sandy';

  const addClones = [];
  clone.add = ({id, url, authFnOut}) => {
    addClones.push({id, url, authFnOut});
  };

  const clones = [rick, morty, sandy];
  clone.updateClones(clones);

  const addClone = addClones[0];
  expect(addClones.length).toEqual(1);
  expect(addClone.id).toEqual('morty');
  expect(addClone.url).toEqual('space.my');
  expect(addClone.authFnOut).toEqual('authFnOut');

});

describe('getRemoteClones', () => {

  test('getRemoteClones', async (done) => {

    const clone = new Clone();

    clone.updateClones = (remoteClones) => {
      const valid = [{id: 'sandy', url: 'space.sy'}, {id: 'leroy', url: 'space.ly'}];
      expect(remoteClones).toMatchObject(valid);
      done();
    };

    const rick = {
      id: 'rick',
      url: 'space.rk',
      sendMes(mes) {
        mes.cbAfterRes({res: [{id: 'sandy', url: 'space.sy'}]});
      }
    };

    const morty = {
      id: 'morty',
      url: 'space.my',
      sendMes(mes) {
        mes.cbAfterRes({res: [{id: 'leroy', url: 'space.ly'}]});
      }
    };

    clone.clones.set('rick', rick);
    clone.clones.set('morty', morty);

    await clone.getRemoteClones();

  });
});