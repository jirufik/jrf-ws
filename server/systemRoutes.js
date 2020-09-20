const Route = require('../common/route/route');
const pathExists = require('jrf-path-exists');
const funcIsAsync = require('../utils/funcIsAsync');

module.exports.generateCloneRoutes = function () {

  const route = new Route({
    route: 'clones',
    act: 'get',
    handler: ({ws, data, stop}) => {

      stop();

      const id = pathExists(data, 'id');
      const url = pathExists(data, 'url');
      const active = pathExists(data, 'active');
      const remoteClones = pathExists(data, 'clones');

      const clones = this.clones.get({id, url, active});

      if (remoteClones) {
        setImmediate(() => this.clones.updateClones(remoteClones));
      }

      return clones;

    }
  });

  this._systemRoutes.add(route);

}

module.exports.generateAuthRoutes = function () {

  const route = new Route({
    route: 'auth',
    handler: async ({ws, data, stop}) => {

      stop();

      if (ws.isAuth) return true;

      ws.isClone = true;
      const authValue = pathExists(data, 'authValue');
      const isFunction = typeof this.authFnIn === 'function';

      if (isFunction) {

        let isAuth = false;

        const isAsync = funcIsAsync(this.authFnIn);
        if (isAsync) {
          isAuth = await this.authFnIn(authValue);
        } else {
          isAuth = this.authFnIn(authValue);
        }

        ws.isAuth = isAuth;

        if (isAuth) {
          this.emit('auth', {server: this, clone: ws});
        } else {
          this.emit('authError', {server: this, clone: ws});
        }

        return isAuth;

      }

      ws.isAuth = true;
      this.emit('auth', {server: this, clone: ws});
      return true;

    }
  });

  this._systemRoutes.add(route);

}

module.exports.generateGroupRoutes = function () {

  // Send mes to group(s)
  let route = new Route({
    route: 'groups',
    act: 'sendMes',
    handler: async ({ws, data, stop}) => {

      stop();

      const id = pathExists(data, 'id');
      const route = pathExists(data, 'route');
      const act = pathExists(data, 'act');
      const dataMes = pathExists(data, 'data');
      let withoutId = pathExists(data, 'withoutId');
      const notSendMe = pathExists(data, 'notSendMe');
      const excludeClones = pathExists(data, 'excludeClones');

      if (notSendMe) {
        withoutId = ws.id;
      }

      await this.groups.sendMes({id, route, act, data: dataMes, withoutId, excludeClones});

      return true;

    }
  });

  this._systemRoutes.add(route);

  // Delete group
  route = new Route({
    route: 'groups',
    act: 'delete',
    handler: async ({ws, data, stop}) => {

      stop();

      const id = pathExists(data, 'id');
      const excludeClones = pathExists(data, 'excludeClones');

      await this.groups.delete({id, excludeClones});

    }
  });

  this._systemRoutes.add(route);

  // Subscribe
  route = new Route({
    route: 'groups',
    act: 'subscribe',
    handler: async ({ws, data, stop}) => {

      stop();

      const id = pathExists(data, 'id');

      await this.groups.addSubscriber({id, ws});

      return true;

    }
  });

  this._systemRoutes.add(route);

  // Unsubscribe
  route = new Route({
    route: 'groups',
    act: 'unsubscribe',
    handler: async ({ws, data, stop}) => {

      stop();

      const id = pathExists(data, 'id');

      await this.groups.deleteSubscriber({id, ws});

      return true;

    }
  });

  this._systemRoutes.add(route);

  // Get my groups
  route = new Route({
    route: 'groups',
    act: 'getMyGroups',
    handler: async ({ws, data, stop}) => {

      stop();

      return Array.from(ws.groups);

    }
  });

  this._systemRoutes.add(route);

}

