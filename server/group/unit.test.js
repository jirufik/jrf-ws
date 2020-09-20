const Group = require('./group');

describe('constructor', () => {

  test('no id', () => {

    let error;
    try {
      const group = new Group({});
    } catch (e) {
      error = e;
    }

    expect(error.message).toEqual('Group id not set');

  });

  test('with data', () => {

    const id = 'truckers';
    const data = {id, part: 2};

    const group = new Group({id, data});

    expect(group.id).toEqual('truckers');
    expect(group.data.id).toEqual('truckers');
    expect(group.data.part).toEqual(2);
    expect(group.subscribers).toMatchObject({});
    expect(group.cache.group).toEqual('truckers');
    expect(group.cache.subscribers.size).toEqual(0);

  });

});

describe('addSubscriber', () => {

  test('addSubscriber', () => {

    const id = 'truckers';
    const group = new Group({id});

    const ws = {
      id: 'rick',
      groups: new Set()
    };

    let wsInCache;
    group.updateCache = ({subscriber}) => wsInCache = subscriber;
    group.addSubscriber(ws);

    const subscriber = group.subscribers.rick;

    expect(subscriber.id).toEqual('rick');
    expect(ws.groups.has('truckers')).toBeTruthy();
    expect(wsInCache.id).toEqual('rick');

  });

});

describe('getSubscribers', () => {

  test('getSubscribers', () => {

    const id = 'truckers';
    const group = new Group({id});

    const rick = {id: 'rick'};
    const morty = {id: 'morty'};

    group.cache.subscribers.add(rick);
    group.cache.subscribers.add(morty);

    const subscribers = group.getSubscribers();

    expect(subscribers).toMatchObject([{id: 'rick'}, {id: 'morty'}]);

  });

});

describe('deleteSubscriber', () => {

  test('delete all', () => {

    let execClearCache = false;
    const id = 'truckers';
    const group = new Group({id});
    group.clearCache = () => execClearCache = true;

    const rick = {
      id: 'rick',
      deleted: false,
      groups: {
        delete() {
          rick.deleted = true;
        }
      }
    };
    const morty = {
      id: 'morty',
      deleted: false,
      groups: {
        delete() {
          morty.deleted = true;
        }
      }
    };

    group.subscribers.rick = rick;
    group.subscribers.morty = morty;
    group.deleteSubscriber();

    expect(execClearCache).toBeTruthy();
    expect(group.subscribers).toMatchObject({});
    expect(rick.deleted).toBeTruthy();
    expect(morty.deleted).toBeTruthy();

  });

  test('delete morty', () => {

    let execUpdateCache = false;
    const id = 'truckers';
    const group = new Group({id});
    group.updateCache = () => execUpdateCache = true;

    const rick = {
      id: 'rick',
      deleted: false,
      groups: {
        delete() {
          rick.deleted = true;
        }
      }
    };
    const morty = {
      id: 'morty',
      deleted: false,
      groups: {
        delete() {
          morty.deleted = true;
        }
      }
    };

    group.subscribers.rick = rick;
    group.subscribers.morty = morty;
    group.deleteSubscriber(rick);

    expect(execUpdateCache).toBeTruthy();
    expect(group.subscribers).toMatchObject({morty});
    expect(rick.deleted).toBeTruthy();
    expect(morty.deleted).toBeFalsy();

  });

});

describe('cache', () => {

  test('clearCache', () => {

    const id = 'truckers';
    const group = new Group({id});

    group.cache.subscribers.add('rick');
    group.cache.subscribers.add('morty');

    group.clearCache();

    expect(group.cache.subscribers.size).toEqual(0);

  });

  test('updateCache refresh', () => {

    let execClearCache = false;
    const id = 'truckers2';
    const group = new Group({id});
    group.clearCache = () => execClearCache = true;

    const rick = 'rick';
    const morty = 'morty';

    group.subscribers = {rick, morty};
    group.cache.group = 'badGroup';
    group.cache.subscribers.add('rick');

    const cache = group.updateCache({refresh: true});

    expect(cache.group).toEqual('truckers2');
    expect(cache.subscribers.size).toEqual(2);
    expect(cache.subscribers.has('rick')).toBeTruthy();
    expect(cache.subscribers.has('morty')).toBeTruthy();

  });

  test('updateCache no subscriber', () => {

    let execClearCache = false;
    const id = 'truckers2';
    const group = new Group({id});
    group.clearCache = () => execClearCache = true;

    const rick = 'rick';
    const morty = 'morty';

    group.subscribers = {rick, morty};
    group.cache.group = 'truckers';
    group.cache.subscribers.add('rick');

    const cache = group.updateCache({});

    expect(cache.group).toEqual('truckers');
    expect(cache.subscribers.size).toEqual(1);
    expect(cache.subscribers.has('rick')).toBeTruthy();
    expect(cache.subscribers.has('morty')).toBeFalsy();

  });

  test('updateCache subscriber is not id in object', () => {

    let execClearCache = false;
    const id = 'truckers2';
    const group = new Group({id});
    group.clearCache = () => execClearCache = true;

    const rick = 'rick';
    const morty = {name: 'morty'};

    group.subscribers = {rick, morty};
    group.cache.group = 'truckers';
    group.cache.subscribers.add('rick');

    const cache = group.updateCache({subscriber: morty});

    expect(cache.group).toEqual('truckers');
    expect(cache.subscribers.size).toEqual(1);
    expect(cache.subscribers.has('rick')).toBeTruthy();
    expect(cache.subscribers.has('morty')).toBeFalsy();

  });

  test('updateCache del subscriber', () => {

    let execClearCache = false;
    const id = 'truckers2';
    const group = new Group({id});
    group.clearCache = () => execClearCache = true;

    const rick = 'rick';
    const morty = 'morty';

    group.subscribers = {rick, morty};
    group.cache.group = 'truckers';
    group.cache.subscribers.add('rick');

    const cache = group.updateCache({subscriber: 'rick', del: true});

    expect(cache.group).toEqual('truckers');
    expect(cache.subscribers.size).toEqual(0);
    expect(cache.subscribers.has('rick')).toBeFalsy();
    expect(cache.subscribers.has('morty')).toBeFalsy();

  });

  test('updateCache add subscriber', () => {

    let execClearCache = false;
    const id = 'truckers2';
    const group = new Group({id});
    group.clearCache = () => execClearCache = true;

    const rick = 'rick';
    const morty = 'morty';

    group.subscribers = {rick, morty};
    group.cache.group = 'truckers';
    group.cache.subscribers.add('rick');

    const cache = group.updateCache({subscriber: 'morty'});

    expect(cache.group).toEqual('truckers');
    expect(cache.subscribers.size).toEqual(2);
    expect(cache.subscribers.has('rick')).toBeTruthy();
    expect(cache.subscribers.has('morty')).toBeTruthy();

  });

});

describe('sendMes', () => {

  test('all subscribers', async (done) => {

    const id = 'truckers2';
    const group = new Group({id});

    const rick = {
      id: 'rick',
      send: false,
      sendMes() {
        this.send = true;
      }
    };

    const morty = {
      id: 'morty',
      send: false,
      sendMes() {
        this.send = true;

        expect(rick.send).toBeTruthy();
        expect(this.send).toBeTruthy();
        done();
      }
    };

    group.subscribers = {rick, morty};
    await group.sendMes({});

  });

  test('without rick', async (done) => {

    const id = 'truckers2';
    const group = new Group({id});

    const rick = {
      id: 'rick',
      send: false,
      sendMes() {
        this.send = true;
      }
    };

    const morty = {
      id: 'morty',
      send: false,
      sendMes() {
        this.send = true;

        expect(rick.send).toBeFalsy();
        expect(this.send).toBeTruthy();
        done();
      }
    };

    group.subscribers = {rick, morty};
    await group.sendMes({withoutId: 'rick'});

  });

});