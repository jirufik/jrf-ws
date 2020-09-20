// Web client, without 'ws' npm package
const client = require('./client');
module.exports = (function () {
  try {
    return client({WebSocket, isWeb: true});
  } catch (e) {
    return {};
  }
})();