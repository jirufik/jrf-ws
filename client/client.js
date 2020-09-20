const EventEmitter = require('events').EventEmitter;
const Route = require('../common/route/route');
const WS = require('../common/ws/ws');

const generateId = require("../utils/generateId");
const funcIsAsync = require('../utils/funcIsAsync');
const pathExists = require('jrf-path-exists');
const parallelProcessing = require('jrf-pip');

/**
 * Client Class
 * Класс Клиент
 *
 * @type {Client}
 */
module.exports = function ({WebSocket, isWeb = false}) {

  return class Client extends EventEmitter {

    /**
     * Create Client
     * Создать клиента
     *
     * @param {string} [id = generateId()] - client id If you do not set it is generated automatically.
     *                                       id клиента. Если не задать то генерируется автоматически.
     *
     * @param {string|Array} url - Server address You can specify an array of clone addresses. If a break occurs
     *                             connections, then the client tries to connect to the next clone (round-robin)
     *                             Адрес сервера. Можно задать массив адресов клонов. Если происходит разрыв
     *                             соединения, то клиент пробует подключиться к следующему клону (round-robin)
     *
     * @param {Object} [data = {}] - Any user data
     *                               Любые пользовательские данные
     *
     * @param {Boolean} [reconnect = true] - Sign of reconnection upon disconnection.
     *                                       Признак переподключения при разрыве соединения.
     *
     * @param {number} [reconnectTimeout = 2000] - Frequency of reconnection attempts
     *                                             Периодичность попыток переподключения
     *
     * @param {number} [awaitResTimeout = 10000] - How long to wait for a response to the sent message
     *                                             for callback function or synchronous style
     *                                             Сколько времени ожидать ответ на отправленное сообщение
     *                                             для функции обратного вызова или синхронного стиля
     *
     * @param {number} [awaitCycleTimeout = 15] - Asynchronous pause between iterations of checking the response to a message
     *                                              Асинхронная пауза между итерациями проверки ответа на сообщение
     *
     * @param {number} [attempts = 0] - The number of attempts to reconnect, if 0 then endless reconnection
     *                                  Количество попыток переподключения, если 0 то бесконечное переподключение
     *
     * @param {boolean} [isClone = false] - A sign that this is a system client for connecting to a clone
     *                                      Признак того что это системный клиент для подключения к клону
     *
     * @param {boolean} [silent = true] - Do not output error messages to the console
     *                                    Не выводить в консоль сообщения об ошибках
     *
     * @param {function} [authFnOut] - Synchronous or asynchronous outbound authentication function
     *                                 connections to clones. Fulfills at event of connection to a clone.
     *                                 At the input, it receives the client object of the clone (client) to which it connects.
     *                                 Return should authValue. By this value, the clone will produce
     *                                 authentication. This value can be anything, for example, a token or api key.
     *                                 Синхронная или асинхронная функция аутентификации исходящих
     *                                 соединений к клонам. Отрабатывает при событии подключения к клону.
     *                                 На входе принимает объект клиента клона (client) к которому подключается.
     *                                 Вернуть должен authValue. По этому значению клон будет производить
     *                                 аутентификацию. Этим значением может быть что угодно, например токен или api key.
     */
    constructor({
                  id = generateId(),
                  url,
                  data = {},
                  reconnect = true,
                  reconnectTimeout = 2000,
                  awaitResTimeout = 10000,
                  awaitCycleTimeout = 15,
                  attempts = 0,
                  isClone = false,
                  authFnOut,
                  silent = true
                } = {}) {

      super();

      this.id = id;
      // Current connection address
      // Адрес текущего подключения
      this.url = null;
      // List of clone addresses that are connected to according to the round-robin rule
      // Список адресов клонов, подключение к которым происходит по правилу round-robin
      this.urls = new Set();
      this.active = false;
      // Client status. true - started, false - stopped
      // Состояние клиента. true - запущен, false - остановлен
      this.reconnect = reconnect;
      this.timeouts = {
        reconnect: reconnectTimeout,
        awaitRes: awaitResTimeout,
        awaitCycle: awaitCycleTimeout
      };
      this.isClone = isClone;
      this.authFnOut = authFnOut;
      this.attempts = attempts;
      this.countAttempts = 0;
      this.data = data;
      // Connection websocket object
      // Объект websocket соединения
      this.socket = null;
      // Routes that route user messages (class Route)
      // Маршруты, которые маршрутизируют пользовательские сообщения (class Route)
      this.routes = new Set();
      // websocket client connection (class WS)
      // клиентское соединение по websocket (class WS)
      this.ws = null;
      // Custom middlewares that process custom messages before routing
      // Пользовательские middlewares, которые обрабатывают пользовательские сообщения до маршрутизации
      this._middlewares = [];
      // Groups to which the client is subscribed
      // Группы на которые подписан клиент
      this.groups = new Set();
      this.silent = silent;
      // Add clone address (s)
      // Добавить адрес(а) клонов
      this.addUrl(url);

      this.on('start', () => {
      });
      this.on('open', () => {
      });
      this.on('stop', () => {
      });
      this.on('close', () => {
      });
      this.on('reconnect', () => {
      });
      this.on('error', () => {
      });
      this.on('noRouting', () => {
      });
      this.on('auth', () => {
      });
      this.on('authError', () => {
      });

    }

    /**
     * Start client
     * Стартовать клиента
     *
     * @param {string|Array} [url] - Server address You can specify an array of clone addresses. If a break occurs
     *                             connections, then the client tries to connect to the next clone (round-robin)
     *                             Адрес сервера. Можно задать массив адресов клонов. Если происходит разрыв
     *                             соединения, то клиент пробует подключиться к следующему клону (round-robin)
     *
     * @param {Object} [opts = {}] - Client options in case ws package client is used
     *                               Опции клиента в том случае если используется клиент ws пакета
     *
     * @param {Boolean} [reconnect = true] - Sign of reconnection upon disconnection.
     *                                       Признак переподключения при разрыве соединения.
     *
     * @param {number} [reconnectTimeout = 2000] - Frequency of reconnection attempts
     *                                             Периодичность попыток переподключения
     *
     * @param {number} [attempts = 0] - The number of attempts to reconnect, if 0 then endless reconnection
     *                                  Количество попыток переподключения, если 0 то бесконечное переподключение
     *
     */
    start({url, opts = {}, reconnect, reconnectTimeout, attempts} = {}) {

      if (url) {
        this.addUrl(url);
      }
      if (attempts) this.attempts = attempts;
      if (typeof reconnect === 'boolean') this.reconnect = reconnect;
      if (reconnectTimeout) this.timeouts.reconnect = reconnectTimeout;

      // Create a client connection
      // Создаем клиентское соединение
      if (isWeb) {
        this.socket = new WebSocket(this.url);
      } else {
        this.socket = new WebSocket(this.url, opts);
      }
      // Initializing a websocket client connection (class WS)
      // Инициализируем клиентское соединение по websocket (class WS)
      this.ws = this._initWS({socket: this.socket});

      // Set the handler when opening the connection
      // Устанавливаем обработчик при открытии соединения
      this.socket.onopen = async () => {

        // If this is a client connecting to the clone, then we start the authentication process
        // Если это клиент подключения к клону, то запускаем процесс аутентификации
        if (this.isClone) {
          await this._authClone();
        }

        // Reset connection counter
        // Сбрасываем счетчик подключений
        this.countAttempts = 0;
        // Put the client in an active state
        // Переводим клиента в активное состояние
        this.active = true;
        // Call the event
        // Вызываем событие
        this.emit('open', {client: this});
        // Restore group subscription
        // Восстанавливаем подписку на группы
        await this._subscribe();

      }

      // Set the error handler
      // Устанавливаем обработчик ошибок
      this.socket.onerror = (error) => {
        this.emit('error', {client: this, error});
        if (!this.silent) console.error(error);
      }

      // Set the handler when closing the connection
      // Устанавливаем обработчик при закрытии соединения
      this.socket.onclose = () => {

        // Put the client in an inactive state
        // Переводим клиента в не активное состояние
        this.active = false;
        // Call the event
        // Вызываем событие
        this.emit('close', {client: this});

        // If there is a limit on the number of attempts to connect,
        // then check the number of attempts used.
        // If the quantity is exceeded, then stop the client.
        // Если стоит ограничение на количество попыток подключиться,
        // то проверяем количество использованных попыток.
        // Если количество превышено, то останавливаем клиента.
        if (this.attempts) {

          const stopReconnect = this.countAttempts >= this.attempts;

          if (stopReconnect) {
            this.stop();
            return;
          }

        }

        // Run reconnection via timeout
        // Запускаем переподключение через timeout
        setTimeout(() => this.reconnectWs(), this.timeouts.reconnect);
      };

      // Set the incoming message handler
      // Устанавливаем обработчик входящего сообщения
      this.socket.onmessage = async (message) => {

        const ws = this.ws;

        // Received Message
        // Пришедшее Сообщение
        let mes = pathExists(message, 'data', '{}');
        mes = JSON.parse(mes);

        const raw = message;
        const type = mes.type;
        const route = mes.route;
        const act = mes.act;
        const data = mes.data;

        // Run message routing
        // Запускаем маршрутизацию сообщения
        const isSystemMes = type === 'system';
        if (isSystemMes) {

        } else {
          await this._routing({mes, route, act, data, raw, ws});
        }

      };

      this.emit('start', {client: this});

    }

    /**
     * Stop the client
     * Останавливаем клиента
     *
     * @param {function} [cb] - The callback function will be called after stopping the client.
     *                          Функция обратного вызова будет вызвана после остановки клиента
     */
    stop({cb} = {}) {

      if (!this.socket) return;

      this.reconnect = false;
      this.socket.close(cb);

      this.emit('stop', {client: this});

    }

    /**
     * Get customer information
     * Получить информацию о клиенте
     *
     * @return {{data: Object, timeouts: {awaitRes: number, reconnect: number, awaitCycle: number}, id: string, url: (null|string), attempts: number}}
     */
    getInfo() {

      const info = {
        id: this.id,
        url: this.url,
        urls: Array.from(this.urls),
        timeouts: this.timeouts,
        attempts: this.attempts,
        data: this.data,
        groups: Array.from(this.groups)
      }

      return info;

    }

    /**
     * Reconnect client using round-robin rule
     * Переподключить клиента по правилу round-robin
     */
    reconnectWs() {

      // If the connection is not established, then try to connect to the next server,
      // according to the round-robin rule, increasing the number of connection attempts
      // Если соединение не установлено, то делаем попытку подключиться к следующему серверу,
      // по правилу round-robin, увеличивая количество попыток подключения
      const isConnect = this.socket.readyState !== 3 && this.socket.readyState !== 2;
      if (isConnect) return;

      this.nextUrl();
      this.countAttempts++;
      this.emit('reconnect', {client: this});
      this.start();

    }

    /**
     * Add Middleware
     * Добавить Middleware
     *
     * @param {function} fn - Synchronous or asynchronous function
     *                        Синхронная или асинхронная функция
     */
    use(fn) {

      if (typeof fn !== 'function') {
        const error = new Error('Middleware type is not a function');
        this.emit('error', {client: this, error});
        throw error;
      }

      this._middlewares.push(fn);

    }

    /**
     * Add route handler
     * Добавить обработчик маршрута
     *
     * @param {string} [route] - Route
     *                           Маршрут
     *
     * @param {string} [act] - Action on the route
     *                         Действие относительно маршрута
     *
     * @param {function} handler - Synchronous or asynchronous function, incoming message handler,
     *                             subject to routing
     *                             Синхронная или асинхронная функция, обработчик входящего сообщения,
     *                             попадающего под маршрутизацию
     */
    addRoute({route, act, handler}) {

      const newRoute = new Route({route, act, handler});
      this.routes.add(newRoute);

    }

    /**
     * Send a message to the server over a client connection
     * Отправить сообщение серверу по клиентскому соединению
     *
     * @param {string} [route] - route
     *                           путь
     *
     * @param {string} [act] - action to be taken relative to the path
     *                         действие которое требуется выполнить относительно пути
     *
     * @param {*} [data] - данные которые требуется отправить
     *                     data to be sent
     *
     * @param {Object} [opts] - Websocket protocol options of the ws package https://github.com/websockets/ws/blob/master/doc/ws.md#websocketsenddata-options-callback
     *                          опции протокола Websocket пакета ws https://github.com/websockets/ws/blob/master/doc/ws.md#websocketsenddata-options-callback
     *
     * @param {function} [cbAfterRes] - callback that will be executed upon the return of the response to the sent message
     *                                  callback который выполнится по возвращению ответа на отправленное сообщение
     *
     * @param {function} [cbAfterSend] - a callback that will be executed after the message is sent https://github.com/websockets/ws/blob/master/doc/ws.md#websocketsenddata-options-callback
     *                                   callback который выполнится после того как сообщение будет отправлено https://github.com/websockets/ws/blob/master/doc/ws.md#websocketsenddata-options-callback
     *
     * @param {boolean} [awaitRes = false] - waiting for an asynchronous response in a synchronous style
     *                                       ожидание асинхронного ответа в синхронном стиле
     *
     * @param {number} [timeout = 10000] - time (ms) to wait for a response after which an exception will be raised
     *                                     время (мс) ожидания ответа, по истечению которого будет вызвано исключение
     *
     * @param {number} [cycleTimeout = 15] - time (ms) between asynchronous iterations of the response check
     *                                       время (мс) между асинхронными итерациями проверки ответа
     *
     * @param {string} [idMesAwaitRes] - id of the message to which the response is sent
     *                                   id сообщения на которое отправляется ответ
     *
     * @return {Promise<void>} - Either nothing, or the answer came from the client
     *                           Либо ничего, либо ответ пришедший с клиента
     */
    async sendMes(params) {

      const noTimeout = !params.timeout;
      if (noTimeout) {
        params.timeout = this.timeouts.awaitRes;
      }

      const noCycleTimeout = !params.cycleTimeout;
      if (noCycleTimeout) {
        params.cycleTimeout = this.timeouts.awaitCycle;
      }

      return await this.ws.sendMes(params);

    }

    /**
     * Subscribe to group posts
     * Подписаться на сообщения группы
     *
     * @param {string} id - group id
     *                      id группы
     * @return {Promise<boolean>}
     */
    async subscribe({id}) {

      if (!id) {
        const error = new Error('id group empty');
        this.emit('error', {client: this, error});
        throw error;
      }

      // System message initiating a group subscription,
      // if there is no such group on the server, then it will be created
      // Системное сообщение инициирующее подписку на группу,
      // если на сервере нет такой группы, то она будет создана
      const mes = {
        type: 'system',
        route: 'groups',
        act: 'subscribe',
        data: {id},
        awaitRes: true
      };

      // Send a system message
      // Отправляем системное сообщение
      const subscribed = await this.ws.sendMes(mes);
      if (!subscribed) {
        const error = new Error(`Failed to subscribe: ${id}`);
        this.emit('error', {client: this, error});
        throw error;
      }

      this.groups.add(id);

      return true;

    }

    /**
     * Unsubscribe from group messages
     * Отписаться от сообщений группы
     *
     * @param {string} id - group id
     *                      id группы
     * @return {Promise<boolean>}
     */
    async unsubscribe({id}) {

      if (!id) {
        const error = new Error('id group empty');
        this.emit('error', {client: this, error});
        throw error;
      }

      // System message initiating unsubscribing from the group
      // Системное сообщение инициирующее отписку от группы
      const mes = {
        type: 'system',
        route: 'groups',
        act: 'unsubscribe',
        data: {id},
        awaitRes: true
      };

      // Send a system message
      // Отправляем системное сообщение
      const unsubscribed = await this.ws.sendMes(mes);
      if (!unsubscribed) {
        const error = new Error(`Failed to unsubscribe: ${id}`);
        this.emit('error', {client: this, error});
        throw error;
      }

      this.groups.delete(id);

      return true;

    }

    /**
     * Get a list of groups the client is subscribed to
     * Получить список групп на которые подписан клиент
     *
     * @return {Promise<void|boolean|*|undefined>}
     */
    async getMyGroups() {

      if (!this.active) {
        return Array.from(this.groups);
      }

      // System message
      // Системное сообщение
      const mes = {
        type: 'system',
        route: 'groups',
        act: 'getMyGroups',
        awaitRes: true
      };

      // Send a system message
      // Отправляем системное сообщение
      const groups = await this.ws.sendMes(mes);
      if (!groups) {
        const error = new Error(`Failed to get my groups`);
        this.emit('error', {client: this, error});
        throw error;
      }

      this.groups.clear();
      for (const group of groups) {
        this.groups.add(group);
      }

      return groups;

    }

    /**
     * Send a message to the subscribers of the group (s). Clones also receive a message
     * Послать сообщение подписчикам групп(ы). Клоны так же получают сообщение
     *
     * @param {null|string|Array} id - group id.
     *                                 If not set, a message is sent to all groups
     *                                 If id is given, then it is sent to the group
     *                                 If an id array is specified, then it is sent to the specified groups
     *                                 id группы.
     *                                 Если не задан, сообщение рассылается всем группам
     *                                 Если задан id, то посылается в группу
     *                                 Если задан массив id, то рассылается указанным группам
     *
     * @param {string} [route] - Route
     *                           Путь
     *
     * @param {string} [act] - Action to be taken relative to the path
     *                         Действие которое требуется выполнить относительно пути
     *
     * @param {*} [data] - Data to send
     *                     Данные которые требуется отправить
     *
     * @param {boolean} [notSendMe = false] - true exclude the current client from receiving a message
     *                                        true исключить получение сообщения текущим клиентом
     * @return {Promise<boolean>}
     */
    async sendMesToGroup({id, route, act, data, notSendMe = false}) {

      // if (!id) throw new Error('id group empty');

      // System message
      // Системное сообщение
      const mes = {
        type: 'system',
        route: 'groups',
        act: 'sendMes',
        data: {id, route, act, data, notSendMe},
        awaitRes: true
      };

      // Send a system message
      // Отправляем системное сообщение
      const sent = await this.ws.sendMes(mes);
      if (!sent) {
        const error = new Error(`Failed send mes to: ${id}`);
        this.emit('error', {client: this, error});
        throw error;
      }

      return true;

    }

    /**
     * Add server address to address list
     * Добавить адрес сервера в список адресов
     *
     * @param {string|array} url - Server(s) address
     *                             Адрес(а) сервера
     */
    addUrl(url) {

      if (!url) return;

      const isArray = Array.isArray(url);

      if (isArray) {
        url.forEach(url => this.urls.add(url));
      } else {
        this.urls.add(url);
      }

      if (!this.url) this.nextUrl();

    }

    /**
     * Set the next server as the current connection address (round-robin)
     * Установить текущим адресом подключения следующий сервер (round-robin)
     *
     * @return {null|string}
     */
    nextUrl() {

      const size = this.urls.size;
      if (!size) return;

      const urls = Array.from(this.urls);

      if (!this.url) {
        this.url = urls[0];
        return this.url;
      }

      let index = urls.indexOf(this.url);
      if (index < 0) {
        this.url = urls[0];
        return this.url;
      }

      ++index;

      if (index >= size) {
        index = 0;
      }

      this.url = urls[index];
      return this.url;

    }

    /**
     * Delete server address (s)
     * Удалить адрес(а) сервера
     *
     * @param {string|null} [url = null] - Server address to be deleted
     *                                     if not set, then all servers are deleted
     *                                     Адрес сервера который требуется удалить,
     *                                     если не задан, то удаляются все сервера
     */
    deleteUrl(url) {

      if (!url) {
        this.urls.clear();
        return;
      }

      const isArray = Array.isArray(url);

      if (isArray) {
        url.forEach(url => this.urls.delete(url));
        return;
      }

      this.urls.delete(url);

    }

    /**
     * Initializing a websocket client connection (class WS)
     * Инициализируем клиентское соединение по websocket (class WS)
     *
     * @param {Object} socket - Websocket client connection object
     *                          Объект клиентского соединения по websocket
     * @private
     */
    _initWS({socket}) {

      const clone = this.isClone;
      const ws = new WS({socket, clone});
      return ws;

    }

    /**
     * Run middlewares before message routing
     * Выполним middlewares перед маршрутизацией сообщения
     *
     * @param {Object} ws - Client Connection Object (class WS)
     *                      Объект клиентского соединения (class WS)
     *
     * @param {Object} mes - The message contains route, act, data
     *                       Сообщение содержит route, act, data
     *
     * @param {Object} raw - Full message, contains user message (mes) and system information
     *                       Полное сообщение, содержит пользовательское сообщение (mes) и системную информацию
     *
     * @return {Promise<boolean>} - If the stop() function is executed in middleware,
     *                              then further routing stops
     *                              Если в middleware будет выполнена функция stop(),
     *                              то дальнейшая маршрутизация останавливается
     * @private
     */
    async _execMiddlewares({ws, mes, raw}) {

      // Continue or stop further routing
      // Продолжить или остановить дальнейшую маршрутизацию
      let flStop = false;
      const stop = () => flStop = true;

      // Incoming message awaiting response
      // Входящее сообщение ожидает ответ
      const awaitRes = pathExists(mes, 'system.awaitRes');
      const mesId = pathExists(mes, 'system.id');
      let res;

      // execute each middleware
      // Выполним каждую middleware
      for (const middleware of this._middlewares) {

        // Define a synchronous or asynchronous function and execute.
        // Pass:
        // ws - Client, class WS client connection object
        // mes - User message route, act, data
        // stop - A synchronous function whose execution stops further routing
        // raw - Full message containing user message (mes) and system information
        // Определим синхронная или асинхронная функция и выполним.
        // Передаем:
        // ws - Клиент, объект клиентского соединения class WS
        // mes - Пользовательское сообщение route, act, data
        // stop - Синхронная функция, выполнение которой останавливает дальнейшую маршрутизацию
        // raw - Полное сообщение, содержащее пользовательское сообщение (mes) и системную информацию
        const isAsync = funcIsAsync(middleware);
        if (isAsync) {
          res = await middleware({ws, mes, stop, raw});
        } else {
          res = middleware({ws, mes, stop, raw});
        }

        if (flStop) {

          // If the incoming message is waiting for a response, then we will send a response
          // Если входящее сообщение ждет ответа, то отправим ответ
          if (awaitRes) {

            const params = {
              data: res,
              idMesAwaitRes: mesId
            }

            await ws.sendMes(params);
          }

          return true;
        }

      }

      return false;

    }

    /**
     * If the incoming message is a response to a previously sent message
     * process it, further routing stops
     * Если входящее сообщение является ответом на ранее отправленное сообщение
     * обработаем его, дальнейший routing останавливается
     *
     * @param {Object} ws - client connection object initialized by the open event
     *                      объект клиентского соединения инициализируемый при событии open
     *
     * @param {Object} mes - User message route, act, data
     *                       Пользовательское сообщение route, act, data
     *
     * @return {boolean} - false continue routing, true stop routing
     *                     false продолжить routing, true остановить routing
     * @private
     */
    _processAwaitRes({ws, mes}) {

      // If the message is not a response, then continue routing
      // Если сообщение не является ответом, то продолжим маршрутизацию
      const id = pathExists(mes, 'system.idMesAwaitRes');
      if (!id) return false;

      // If the message is a response, then fill out the response, routing stops
      // Если сообщения является ответом, то заполним ответ, маршрутизация останавливается
      const res = pathExists(mes, 'data');

      ws.fillRes({id, res});

      return true;

    }

    async _subscribe() {

      // Subscribe in parallel to no more than 1 000 groups
      // Подписываться параллельно не более чем на 1000 групп
      const parallel = 1000;

      // Get groups
      // Получим группы
      const groups = Array.from(this.groups);
      const noGroups = !groups || !groups.length;
      if (noGroups) return;

      // Processing function. Subscribe to the group
      // Функция обработки. Подписаться на группу
      const processingFn = async ({value}) => {
        const id = value;
        await this.subscribe({id});
      };

      // Start the process of parallel group subscription
      // Запускаем процесс параллельной подписки на группы
      await parallelProcessing({arrayValues: groups, processingFn, parallel});

    }

    /**
     * Выполнить маршрутизацию сообщения
     *
     * @param {Object} ws - Client Connection Object (class WS)
     *                      Объект клиентского соединения (class WS)
     *
     * @param {string} route - Route
     *                         Маршрут
     *
     * @param {string} act - Action on the route
     *                       Действие относительно маршрута
     *
     * @param {*} data - message data
     *                   данные сообщения
     *
     * @param {Object} mes - The message contains route, act, data
     *                       Сообщение содержит route, act, data
     *
     * @param {Object} raw - Full message, contains user message (mes) and system information
     *                       Полное сообщение, содержит пользовательское сообщение (mes) и системную информацию
     *
     * @return {Promise<void>}      If the stop() function is executed,
     *                              then further routing stops
     *                              Если будет выполнена функция stop(),
     *                              то дальнейшая маршрутизация останавливается
     * @private
     */
    async _execRoutes({ws, route, act, data, mes}) {

      // Continue or stop further routing
      // Продолжить или остановить дальнейшую маршрутизацию
      let flStop = false;
      const stop = () => flStop = true;

      // Incoming message awaiting response
      // Входящее сообщение ожидает ответ
      const awaitRes = pathExists(mes, 'system.awaitRes');
      const mesId = pathExists(mes, 'system.id');
      let res;

      // Sign whether the message passed routing
      // Признак прошло ли сообщение маршрутизацию
      let isMatch = false;

      // We go through each route
      // Проходим каждый маршрут
      for (const routeEl of this.routes) {

        // If the message does not go through routing, then go to the next route
        // Если сообщение не проходит маршрутизацию, то переходим к следующему маршруту
        const handler = routeEl.match({route, act});
        if (!handler) continue;

        isMatch = true;

        // If routing is passed.
        // Define a synchronous or asynchronous handler.
        // Pass:
        // ws - Client, class WS client connection object
        // data - Message data
        // stop - A synchronous function whose execution stops further routing
        // Если маршрутизация пройдена.
        // Определим синхронный или асинхронный обработчик.
        // Передаем:
        // ws - Клиент, объект клиентского соединения class WS
        // data - Данные сообщения
        // stop - Синхронная функция, выполнение которой останавливает дальнейшую маршрутизацию
        const isAsync = funcIsAsync(handler);
        if (isAsync) {
          res = await handler({ws, data, stop});
        } else {
          res = handler({ws, data, stop});
        }

        if (flStop) break;

      }

      // If the incoming message is waiting for a response, then we will send a response
      // Если входящее сообщение ждет ответа, то отправим ответ
      if (awaitRes) {

        const params = {
          data: res,
          idMesAwaitRes: mesId
        }

        await ws.sendMes(params);
      }

      if (!isMatch) this.emit('noRouting', {client: this, ws, data});

    }

    /**
     * Let's route the incoming message
     * Выполним маршрутизацию входящего сообщения
     *
     * @param {Object} ws - Client Connection Object (class WS)
     *                      Объект клиентского соединения (class WS)
     *
     * @param {string} route - Route
     *                         Маршрут
     *
     * @param {string} act - Action on the route
     *                       Действие относительно маршрута
     *
     * @param {*} data - message data
     *                   данные сообщения
     *
     * @param {Object} raw - Full message, contains user message (mes) and system information
     *                       Полное сообщение, содержит пользовательское сообщение (mes) и системную информацию
     * @return {Promise<void>}
     * @private
     */
    async _routing({mes, route, act, data, raw, ws}) {

      // Run middlewares
      // Выполним middlewares
      let stop = await this._execMiddlewares({ws, mes, raw});
      if (stop) return;

      // If the message is a response to a previously sent message, then process it
      // Если сообщение является ответом на ранее отправленное сообщение, то обработаем его
      stop = this._processAwaitRes({ws, mes});
      if (stop) return;

      // If the previous processing steps did not stop the message, then execute routing
      // Если предыдущие этапы обработки не остановили сообщение, то выполним routing
      await this._execRoutes({ws, route, act, data, mes});

    }

    /**
     * If this is a client connecting to a remote clone, then authenticate
     * Если это клиент подключения к удаленному клону то пройдем аутентификацию
     *
     * @return {Promise<void>}
     * @private
     */
    async _authClone() {

      // Get the value for authentication if the value generation function was set
      // for example, it can return apikey or token, etc.
      // Получим значение для аутентификации если была задана функция генерации значения
      // например она может возвращать apikey или token итд
      let authValue = null;
      let auth = false;

      const isFunction = typeof this.authFnOut === 'function';

      if (isFunction) {

        const isAsync = funcIsAsync(this.authFnOut);

        if (isAsync) {
          authValue = await this.authFnOut(this);
        } else {
          authValue = this.authFnOut(this);
        }

      }

      // Send the system authentication request to the remote clone
      // Отправляем удаленному клону системный запрос аутентификации
      const mes = {
        type: 'system',
        route: 'auth',
        data: {
          authValue
        },
        awaitRes: true,
        timeout: 5000
      }

      try {

        auth = await this.ws.sendMes(mes);

        if (!auth) {
          const error = new Error(`Clone authentication failed: ${this.id}`);
          this.emit('error', {client: this, error});
          this.emit('authError', {client: this, error});
          throw error;
        }

        this.emit('auth', {client: this});

      } catch (e) {
        if (!this.silent) console.error(e);
      }

      // If authentication fails, disconnect
      // Если аутентификация не пройдена разрываем соединение
      if (!auth) this.socket.close();

    }
  }

};
