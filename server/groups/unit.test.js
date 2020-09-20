const Groups = require('./groups');

describe('constructor', () => {

  test('constructor', () => {

    const groups = new Groups({server: 'server'});

    expect(groups.server).toEqual('server');
    expect(groups.groups).toMatchObject({});
    expect(groups.cache.groups).toBeNull();

  });

});

describe('add', () => {

  test('no id', () => {

    const groups = new Groups({server: 'server'});

    let error;
    try {
      groups.add({});
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('Group id not set');

  });

  test('id', () => {

    const groups = new Groups({server: 'server'});

    const id = 'rick';
    const ws = {
      execAddSubscriber: false,
      addSubscriber() {
        this.execAddSubscriber = true;
      }
    }

    groups._initGroup = () => ws;
    let execUpdateCache = false;
    groups.updateCache = () => execUpdateCache = true;

    groups.add({id, ws});

    expect(ws.execAddSubscriber).toBeTruthy();
    expect(execUpdateCache).toBeTruthy();

  });

});

describe('addSubscriber', () => {

  test('no id', () => {

    const groups = new Groups({server: 'server'});

    let error;
    try {
      groups.addSubscriber({});
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('Group id not set');

  });

  test('no ws', () => {

    const groups = new Groups({server: 'server'});

    let error;
    try {
      groups.addSubscriber({id: 'rick'});
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('Not defined subscriber');

  });

  test('id and ws', () => {

    const groups = new Groups({server: 'server'});

    const id = 'rick';
    const ws = {
      execAddSubscriber: false,
      addSubscriber() {
        this.execAddSubscriber = true;
      }
    }

    groups._initGroup = () => ws;
    let execUpdateCache = false;
    groups.updateCache = () => execUpdateCache = true;

    groups.addSubscriber({id, ws});

    expect(ws.execAddSubscriber).toBeTruthy();
    expect(execUpdateCache).toBeTruthy();

  });

});

describe('get', () => {

  test('all groups', () => {

    const groups = new Groups({server: 'server'});

    let execUpdateCache = false;
    groups.updateCache = () => {
      execUpdateCache = true;
      groups.cache.groups = 'groups';
    }

    const cache = groups.get();

    expect(cache).toEqual('groups');
    expect(execUpdateCache).toBeTruthy();

  });

  test('rick group', () => {

    const groups = new Groups({server: 'server'});
    groups.cache.groups = {rick: 'rick', morty: 'morty'};

    const cache = groups.get({id: 'rick'});

    expect(cache).toEqual('rick');

  });

});

describe('delete', () => {

  test('no id', () => {

    const groups = new Groups({server: 'server'});

    let error;
    try {
      groups.delete({});
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('Group id not set');

  });

  test('id', (done) => {

    const groups = new Groups({server: 'server'});

    const ws = {
      execDeleteSubscriber: false,
      deleteSubscriber() {
        this.execDeleteSubscriber = true;
      }
    };

    groups.groups = {rick: 'rick'};

    groups._initGroup = () => ws;
    let execUpdateCache = false;
    groups.updateCache = () => execUpdateCache = true;

    groups.delete({id: 'rick'});

    groups._deleteToClones = async () => {

      expect(ws.execDeleteSubscriber).toBeTruthy();
      expect(execUpdateCache).toBeTruthy();
      expect(groups.groups.rick).toBeUndefined();

      done();

    }

  });

});

describe('deleteSubscriber', () => {

  test('no ws', () => {

    const groups = new Groups({server: 'server'});

    let error;
    try {
      groups.deleteSubscriber({});
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('Not defined subscriber');

  });

  test('rick subscriber', () => {

    const groups = new Groups({server: 'server'});

    const ws = {
      execDeleteSubscriber: false,
      deleteSubscriber() {
        this.execDeleteSubscriber = true;
      }
    };

    groups.groups = {rick: 'rick'};

    groups._initGroup = () => ws;
    let execUpdateCache = false;
    groups.updateCache = () => execUpdateCache = true;

    groups.deleteSubscriber({id: 'rick', ws});

    expect(ws.execDeleteSubscriber).toBeTruthy();
    expect(execUpdateCache).toBeTruthy();

  });

  test('without id', (done) => {

    const groups = new Groups({server: 'server'});

    const ws = {
      execDeleteSubscriber: false,
      deleteSubscriber() {
        this.execDeleteSubscriber = true;
      }
    };

    groups.groups = {rick: 'rick'};

    groups._initGroup = () => ws;
    let execUpdateCache = false;
    groups.updateCache = () => execUpdateCache = true;

    groups.deleteSubscriber({ws});

    groups._deleteSubscriberInAllGroups = async () => {
      done();
    }

  });

});

describe('_deleteSubscriberInAllGroups', () => {

  test('_deleteSubscriberInAllGroups', async (done) => {

    const groups = new Groups({server: 'server'});

    const truckers = {
      id: 'truckers',
      execDeleteSubscriber: false,
    };

    const truckers2 = {
      id: 'truckers2',
      execDeleteSubscriber: false,
    };

    groups.groups = {truckers, truckers2};

    groups.deleteSubscriber = ({id, ws}) => {

      groups.groups[id].execDeleteSubscriber = true;
      if (id !== 'truckers2') return;

      expect(truckers.execDeleteSubscriber).toBeTruthy();
      expect(truckers2.execDeleteSubscriber).toBeTruthy();

      done();

    };

    await groups._deleteSubscriberInAllGroups();

  });

});

describe('sendMes', () => {

  test('send all groups', async () => {

    const groups = new Groups({server: 'server'});

    const truckers = {
      id: 'truckers',
      execSendMes: false,
      async sendMes() {
        this.execSendMes = true;
      }
    };

    const truckers2 = {
      id: 'truckers2',
      execSendMes: false,
      async sendMes() {
        this.execSendMes = true;
      }
    };

    groups.groups = {truckers, truckers2};
    let execSendMesToClones = false;
    groups._sendMesToClones = async () => execSendMesToClones = true;

    await groups.sendMes({});

    expect(truckers.execSendMes).toBeTruthy();
    expect(truckers2.execSendMes).toBeTruthy();
    expect(execSendMesToClones).toBeTruthy();

  });

  test('send [truckers, truckers2] groups', async () => {

    const groups = new Groups({server: 'server'});

    const truckers = {
      id: 'truckers',
      execSendMes: false,
      async sendMes() {
        this.execSendMes = true;
      }
    };

    const truckers2 = {
      id: 'truckers2',
      execSendMes: false,
      async sendMes() {
        this.execSendMes = true;
      }
    };

    groups.groups = {truckers, truckers2};
    let execSendMesToClones = false;
    groups._sendMesToClones = async () => execSendMesToClones = true;

    await groups.sendMes({id: ['truckers', 'truckers2']});

    expect(truckers.execSendMes).toBeTruthy();
    expect(truckers2.execSendMes).toBeTruthy();
    expect(execSendMesToClones).toBeTruthy();

  });

  test('send truckers2 groups', async () => {

    const groups = new Groups({server: 'server'});

    const truckers = {
      id: 'truckers',
      execSendMes: false,
      async sendMes() {
        this.execSendMes = true;
      }
    };

    const truckers2 = {
      id: 'truckers2',
      execSendMes: false,
      async sendMes() {
        this.execSendMes = true;
      }
    };

    groups.groups = {truckers, truckers2};
    let execSendMesToClones = false;
    groups._sendMesToClones = async () => execSendMesToClones = true;

    await groups.sendMes({id: 'truckers2'});

    expect(truckers.execSendMes).toBeFalsy();
    expect(truckers2.execSendMes).toBeTruthy();
    expect(execSendMesToClones).toBeTruthy();

  });

});

describe('updateCache', () => {

  test('empty cache', () => {

    const groups = new Groups({server: 'server'});

    const cache = groups.updateCache({});

    expect(cache).toBeUndefined();

  });

  test('refresh', () => {

    const groups = new Groups({server: 'server'});

    const truckers = {
      id: 'truckers',
      getSubscribers() {
        return [1, 2];
      }
    };

    const truckers2 = {
      id: 'truckers2',
      getSubscribers() {
        return [3, 4];
      }
    };

    groups.groups = {truckers, truckers2};
    let execClearCache = false;
    groups.clearCache = () => execClearCache = true;

    const cache = groups.updateCache({refresh: true});

    expect(cache.groups.truckers).toMatchObject([1, 2]);
    expect(cache.groups.truckers2).toMatchObject([3, 4]);
    expect(execClearCache).toBeTruthy();

  });

  test('delete truckers', () => {

    const groups = new Groups({server: 'server'});

    const truckers = {
      id: 'truckers',
      getSubscribers() {
        return [1, 2];
      }
    };

    const truckers2 = {
      id: 'truckers2',
      getSubscribers() {
        return [3, 4];
      }
    };

    groups.groups = {truckers, truckers2};
    groups.cache.groups = {truckers: true, truckers2: true};

    const cache = groups.updateCache({id: 'truckers', del: true});

    expect(cache.groups.truckers).toBeUndefined();
    expect(cache.groups.truckers2).toBeTruthy();

  });

  test('add truckers2', () => {

    const groups = new Groups({server: 'server'});

    const truckers = {
      id: 'truckers',
      getSubscribers() {
        return [1, 2];
      }
    };

    const truckers2 = {
      id: 'truckers2',
      getSubscribers() {
        return [3, 4];
      }
    };

    groups.groups = {truckers, truckers2};
    groups.cache.groups = {truckers: [1, 2]};

    const cache = groups.updateCache({id: 'truckers2'});

    expect(cache.groups.truckers).toMatchObject([1, 2]);
    expect(cache.groups.truckers2).toMatchObject([3, 4]);

  });

});

describe('clearCache', () => {

  test('clearCache', () => {

    const groups = new Groups({server: 'server'});

    groups.cache.groups = true;
    groups.clearCache();

    expect(groups.cache.groups).toBeNull();

  });

});

describe('_sendMesToClones', () => {

  test('_sendMesToClones', async (done) => {

    let execInitExcludeClones = false;

    const server = {
      id: 'server',
      clones: {
        clones: {

          clone1: {
            send: false,
            async sendMes() {
              this.send = true;
            }
          },

          clone2: {
            send: false,
            async sendMes() {
              this.send = true;

              expect(server.clones.clones.clone1.send).toBeTruthy();
              expect(execInitExcludeClones).toBeTruthy();

              done();
            }
          },

          get(id) {
            return this[id];
          }
        }
      }
    }

    const groups = new Groups({server});

    groups._initExcludeClones = () => execInitExcludeClones = true;
    groups._initActiveClones = () => ['clone1', 'clone2'];

    await groups._sendMesToClones({});

  });

});

describe('_deleteToClones', () => {

  test('_deleteToClones', async (done) => {

    let execInitExcludeClones = false;

    const server = {
      id: 'server',
      clones: {
        clones: {

          clone1: {
            send: false,
            async sendMes() {
              this.send = true;
            }
          },

          clone2: {
            send: false,
            async sendMes() {
              this.send = true;

              expect(server.clones.clones.clone1.send).toBeTruthy();
              expect(execInitExcludeClones).toBeTruthy();

              done();
            }
          },

          get(id) {
            return this[id];
          }
        }
      }
    }

    const groups = new Groups({server});

    groups._initExcludeClones = () => execInitExcludeClones = true;
    groups._initActiveClones = () => ['clone1', 'clone2'];

    await groups._deleteToClones({});

  });

});

describe('_initExcludeClones', () => {

  test('empty excludeClones', () => {

    const groups = new Groups({server: 'server'});

    const res = groups._initExcludeClones({});

    expect(res).toMatchObject([]);

  });

  test('exclude clone1', () => {

    const groups = new Groups({server: 'server'});

    const res = groups._initExcludeClones({excludeClones: 'clone1'});

    expect(res).toMatchObject(['clone1']);

  });

  test('exclude clone1, clone2', () => {

    const groups = new Groups({server: 'server'});

    const res = groups._initExcludeClones({excludeClones: ['clone1', 'clone2']});

    expect(res).toMatchObject(['clone1', 'clone2']);

  });

});

describe('_initActiveClones', () => {

  test('_initActiveClones', () => {

    const server = {
      id: 'server',
      clones: {
        get() {
          return [{id: 'clone1'}, {id: 'clone2'}];
        }
      }
    };

    const groups = new Groups({server});

    const res = groups._initActiveClones({excludeClones: ['clone1']});

    expect(res).toMatchObject(['clone2']);

  });

});

describe('_initGroup', () => {

  test('truckers2', () => {

    const groups = new Groups({});

    groups.groups.truckers2 = true;
    const res = groups._initGroup({id: 'truckers2'});

    expect(res).toBeTruthy();

  });

  test('add truckers2', () => {

    const groups = new Groups({});

    const res = groups._initGroup({id: 'truckers2', data: {name: 'truckers2'}});

    expect(res.id).toEqual('truckers2');
    expect(res.data.name).toEqual('truckers2');

  });

});