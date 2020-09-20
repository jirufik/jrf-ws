const Route = require('./route');

test('Empty params', () => {

  let msg = null;
  const message = 'The handler must be a function';

  try {
    const route = new Route({});
  } catch (e) {
    msg = e.message;
  }

  expect(msg).toEqual(message);

});

test('Handler not function', () => {

  let msg = null;
  const message = 'The handler must be a function';
  const handler = {};

  try {
    const route = new Route({handler});
  } catch (e) {
    msg = e.message;
  }

  expect(msg).toEqual(message);

});

test('Create route', () => {

  const act = 'act';
  const handler = () => {
  };

  const route = new Route({route: 'route', act, handler});

  expect(route.route).toEqual('route');
  expect(route.act).toEqual('act');
  expect(route.handler).toEqual(handler);

});

test('Without route', () => {

  const handler = () => {
  };

  const objRoute = new Route({handler});
  const res = objRoute._match({route: 'route', act: 'act'});

  expect(res).toBeTruthy();

});

test('With route, no match', () => {

  const handler = () => {
  };
  const route = 'route'

  const objRoute = new Route({handler, route});
  const res = objRoute._match({route: 'route1'});

  expect(res).toBeFalsy();

});

test('With route, match', () => {

  const handler = () => {
  };
  const route = 'route'

  const objRoute = new Route({handler, route});
  const res = objRoute._match({route: 'route'});

  expect(res).toBeTruthy();

});

test('With route, match with act', () => {

  const handler = () => {
  };
  const route = 'route'

  const objRoute = new Route({handler, route});
  const res = objRoute._match({route: 'route', act: 'act'});

  expect(res).toBeTruthy();

});

test('With route, with act, no match', () => {

  const handler = () => {
  };
  const route = 'route'
  const act = 'act'

  const objRoute = new Route({handler, route, act});
  const res = objRoute._match({route: 'route'});

  expect(res).toBeFalsy();

});

test('With route, with act, match', () => {

  const handler = () => {
  };
  const route = 'route'
  const act = 'act'

  const objRoute = new Route({handler, route, act});
  const res = objRoute._match({route: 'route', act: 'act'});

  expect(res).toBeTruthy();

});

test('math return false', () => {

  const handler = () => {
  };
  const route = 'route'
  const act = 'act'

  const objRoute = new Route({handler, route, act});
  const res = objRoute.match({route: 'route', act: 'act1'});

  expect(res).toBeFalsy();

});

test('math return handler', () => {

  const handler = () => {
  };
  const route = 'route'
  const act = 'act'

  const objRoute = new Route({handler, route, act});
  const res = objRoute.match({route: 'route', act: 'act'});

  expect(res).toEqual(handler);

});