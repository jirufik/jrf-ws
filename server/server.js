const EventEmitter = require('events').EventEmitter;
const WebSocket = require('ws');
const Route = require('../common/route/route');
const Clones = require('./clones/clones');
const WS = require('../common/ws/ws');
const Groups = require('./groups/groups');

const generateId = require("../utils/generateId");
const pathExists = require('jrf-path-exists');
const funcIsAsync = require('../utils/funcIsAsync');
const parallelProcessing = require('jrf-pip');

const {
  generateCloneRoutes,
  generateAuthRoutes,
  generateGroupRoutes
} = require('./systemRoutes');

/**
 * The server class implements the server part
 * Класс сервер реализует серверную часть
 *
 * @type {Server}
 */
module.exports = class Server extends EventEmitter {

  /**
   * Create Server
   * Создать Сервер
   *
   * @param {string} [id = generateId()] - server id By default, generated automatically.
   *                                       But if horizontal scaling is used,
   *                                       it’s better to ask explicitly.
   *                                       id сервера. По умолчанию генерируется автоматически.
   *                                       Но если используется горизонтальное масштабирование,
   *                                       то лучше задать явно.
   *
   * @param {number} [port = 3000] - The port on which the server will accept connections
   *                                 Порт на котором сервер будет принимать соединения
   *
   * @param {string} [url] - server connection address
   *                         адрес подключения к серверу
   *
   * @param {Object} [data] - Any user data
   *                          Любые пользовательские данные
   *
   * @param {function} [authFnIn] - Synchronous or asynchronous inbound authentication function
   *                                compounds from clones. Fulfills at event of connection of a clone.
   *                                At the input, it takes the authValue parameter from the connecting clone.
   *                                This value can be anything, for example, a token or api key.
   *                                If it returns false, then the connection is disconnected.
   *                                If it returns true, then the clone is allowed to connect.
   *                                Синхронная или асинхронная функция аутентификации входящих
   *                                соединений от клонов. Отрабатывает при событии подключения клона.
   *                                На входе принимает параметр authValue от подключающегося клона.
   *                                Этим значением может быть что угодно, например токен или api key.
   *                                Если вернет false - то подключение разрывается.
   *                                Если вернет true - то клону разрешается подключение.
   *
   * @param {function} authFnOut - Synchronous or asynchronous outbound authentication function
   *                               connections to clones. Fulfills at event of connection to a clone.
   *                               At the input, it receives the client object of the clone (client) to which it connects.
   *                               Return should authValue. By this value, the clone will produce
   *                               authentication. This value can be anything, for example, a token or api key.
   *                               Синхронная или асинхронная функция аутентификации исходящих
   *                               соединений к клонам. Отрабатывает при событии подключения к клону.
   *                               На входе принимает объект клиента клона (client) к которому подключается.
   *                               Вернуть должен authValue. По этому значению клон будет производить
   *                               аутентификацию. Этим значением может быть что угодно, например токен или api key.
   */
  constructor({
                id = generateId(),
                port = 3000,
                url,
                data = {},
                authFnIn,
                authFnOut
              } = {}) {

    super();

    // ws package server object working with websocket connections
    // Объект сервера пакета ws работающий с websocket соединениями
    this.wss = null;
    this.id = id;
    this.port = port;
    this.url = url;
    // Server status. true - started, false - stopped
    // Состояние сервера. true - запущен, false - остановлен
    this.active = false;
    this.data = data;
    this.authFnIn = authFnIn;
    this.authFnOut = authFnOut;
    // Routes that route user messages (class Route)
    // Маршруты, которые маршрутизируют пользовательские сообщения (class Route)
    this.routes = new Set();
    // Group Manager
    // Менеджер групп
    this.groups = new Groups({server: this});
    // System routes, for routing system messages (class Route)
    // Системные маршруты, для маршрутизации системных сообщений (class Route)
    this._systemRoutes = new Set();
    // Custom middlewares that process custom messages before routing
    // Пользовательские middlewares, которые обрабатывают пользовательские сообщения до маршрутизации
    this._middlewares = [];
    // Client connections:
    // Key - id of the client connection from the server side (generated automatically)
    // Value - object of the client connection (class WS)
    // Клиентские соединения:
    // Ключ - id клиентского соединения со стороны сервера (сгенерирован автоматически)
    // Значение - объект клиентского соединения (class WS)
    this.clients = {};
    // Clone manager. The timeout sets the frequency interval with which clones will be polled
    // Менеджер клонов. В timeout задается интервал периодичности, с котрой будут опрашиваться клоны
    this.clones = new Clones({server: this, interval: 2000});
    this.timeouts = {
      // Interval with what frequency will clients that have disconnected from the server be deleted.
      // This functionality is a fuse. Because the client is deleted when the connection is disconnected.
      // Интервал с какой периодичностью будут удаляться клиенты, у которых разорвано соединение с сервером.
      // Данный функционал является предохранителем. Т.к. клиент удаляется при событии разрыва соединения.
      clearOfflineClients: 1000 * 30//60 * 60
    }
    // id of the timer that triggers the removal of clients with a disconnected connection
    // id таймера запускающего удаление клиентов с разорванным соединением
    this._clearOfflineClientsId = null;
    // Generate system message routing
    // Генерация маршрутизации системных сообщений
    this._generateSystemRoutes();

    this.on('start', () => {
    });
    this.on('connection', () => {
    });
    this.on('stop', () => {
    });
    this.on('close', () => {
    });
    this.on('closeClient', () => {
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
   * Start server
   * Запустить сервер
   *
   * @param {Object} [opts] - Ws package server options object
   *                          Объект опций сервера пакета ws
   *                          https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback
   */
  start(opts) {

    const port = this.port;
    const processPort = typeof opts === 'object' && !opts.server;
    if (processPort) {
      opts.port = opts.port || port;
    }

    this.wss = new WebSocket.Server(opts || {port});
    // We translate the server into the active (running) state i.e. ready to accept incoming connections
    // Переводим сервер в активное (запущенное) состояние т.е. готов принимать входящие соединения
    this.active = true;
    // Hang the handler on the event of the client connecting to the server. We pass the socket as a parameter.
    // Вешаем обработчик на событие подключения клиента к серверу. В качестве параметра передаем соединение.
    this.wss.on('connection', socket => {
      this._connection(socket);
      this.emit('connection', {server: this});
    });
    this.wss.on('close', socket => {
      this.emit('close', {server: this});
    });
    // Run the clone manager
    // Запускаем менеджер клонов
    this.clones.start();
    // Start the process of removing clients with a disconnected connection
    // Запускаем процесс удаления клиентов с разорванным соединением
    this._startClearOfflineClients();

    this.emit('start', {server: this});

  }

  /**
   * Stop server
   * Остановить сервер
   *
   * @param {function} [cb] - Callback function, will work after server shutdown
   *                          Функция обратного вызова, отработает после остановки сервера
   */
  stop({cb} = {}) {

    // Put the server in an inactive state
    // Переводим сервер в не активное состояние
    this.active = false;
    // Stop The Clone Manager
    // Останавливаем менеджер клонов
    this.clones.stop();
    // Close the ws package server object
    // Закрываем объект сервера пакета ws
    this.wss.close(cb);

    this.emit('stop', {server: this});

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
      this.emit('error', {server: this, error});
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
   * Добавить клона
   *
   * @param {string} id - clone id
   *                      id клона
   *
   * @param {string} url - clone connection address
   *                       адрес подключения к клону
   *
   * @param {function} [authFnOut] - Synchronous or asynchronous outbound authentication function
   *                               connections to the clone. Fulfills at event of connection to a clone.
   *                               At the input, it receives the object of the client clone (class Client) to which it connects.
   *                               Return should authValue. By this value, the clone will produce
   *                               authentication. This value can be anything, for example, a token or api key.
   *                               If the function is not specified, then the function specified when creating the server is used.
   *                               Синхронная или асинхронная функция аутентификации исходящего
   *                               соединений к клону. Отрабатывает при событии подключения к клону.
   *                               На входе принимает объект клиента клона (class Client) к которому подключается.
   *                               Вернуть должна authValue. По этому значению клон будет производить
   *                               аутентификацию. Этим значением может быть что угодно, например токен или api key.
   *                               Если функция не задана, то используется функция заданная при создании сервера.
   */
  addClone({id, url, authFnOut}) {
    authFnOut = authFnOut || this.authFnOut;
    this.clones.add({id, url, authFnOut});
  }

  /**
   * Delete remote clone
   * Удалить удаленный клон
   *
   * @param {string} id - clone id
   *                      id клона
   */
  deleteClone({id}) {
    this.clones.delete({id});
  }

  /**
   * Update authFnOut
   * Обновить authFnOut
   *
   * @param {function} [authFnOut] - Synchronous or asynchronous outbound authentication function
   *                               connections to the clone. Fulfills at event of connection to a clone.
   *                               At the input, it receives the object of the client clone (class Client) to which it connects.
   *                               Return should authValue. By this value, the clone will produce
   *                               authentication. This value can be anything, for example, a token or api key.
   *                               If the function is not specified, then the function specified when creating the server is used.
   *                               Синхронная или асинхронная функция аутентификации исходящего
   *                               соединений к клону. Отрабатывает при событии подключения к клону.
   *                               На входе принимает объект клиента клона (class Client) к которому подключается.
   *                               Вернуть должна authValue. По этому значению клон будет производить
   *                               аутентификацию. Этим значением может быть что угодно, например токен или api key.
   *                               Если функция не задана, то используется функция заданная при создании сервера.
   */
  updateAuthFnOut({authFnOut}) {

    this.authFnOut = authFnOut;

    const clones = this.clones.clones.values();
    for (const clone of clones) {

      clone.authFnOut = this.authFnOut;
      clone.stop();
      clone.start();

    }

  }

  /**
   * Delete client objects (class WS) with a broken connection. Deletes in parallel
   * Удалить объекты клиентов (class WS) с разорванным соединением. Удаляет параллельно
   *
   * @return {Promise<void>}
   */
  async clearOfflineClients() {

    // Delete no more than 1000 clients in parallel
    // Удалять параллельно не больше 1000 клиентов
    const parallel = 1000;
    // Get client objects
    // Получим объекты клиентов
    const clients = Object.values(this.clients);
    const isEmpty = !clients || !clients.length;
    if (isEmpty) return;

    // Filter function. Skip clients whose connection is active
    // Функция фильтрации. Пропустим клиентов соединение которых активно
    const nextValueFn = ({value}) => {

      const ws = value;
      const next = !ws || !ws.socket
      if (next) return true;

      const isOpen = ws.socket.readyState === 0 || ws.socket.readyState === 1;
      if (isOpen) return true;

    };

    // Processing function. Deletes a client (class WS)
    // Функция обработки. Удаляет клиента (class WS)
    const processingFn = ({value}) => {
      const ws = value;
      this._deleteClient({ws});
    };

    // Run the process of parallel deletion of clients
    // Запускаем процесс параллельного удаления клиентов
    await parallelProcessing({arrayValues: clients, processingFn, nextValueFn, parallel});

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

    const ws = new WS({socket});
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
    const groups = this.groups;

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
      // groups - Group manager class Groups
      // mes - User message route, act, data
      // stop - A synchronous function whose execution stops further routing
      // raw - Full message containing user message (mes) and system information
      // Определим синхронная или асинхронная функция и выполним.
      // Передаем:
      // ws - Клиент, объект клиентского соединения class WS
      // groups - Менеджер групп class Groups
      // mes - Пользовательское сообщение route, act, data
      // stop - Синхронная функция, выполнение которой останавливает дальнейшую маршрутизацию
      // raw - Полное сообщение, содержащее пользовательское сообщение (mes) и системную информацию
      const isAsync = funcIsAsync(middleware);
      if (isAsync) {
        res = await middleware({ws, groups, mes, stop, raw});
      } else {
        res = middleware({ws, groups, mes, stop, raw});
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
   * @param {Object} ws - client connection object initialized by the connect event
   *                      объект клиентского соединения инициализируемый при событии connect
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

  /**
   * Выполнить маршрутизацию сообщения
   *
   * @param {Object} ws - Client Connection Object (class WS)
   *                      Объект клиентского соединения (class WS)
   *
   * @param {string} route - Route
   *                           Маршрут
   *
   * @param {string} act - Action on the route
   *                         Действие относительно маршрута
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
   * @param {boolean} isSystem - Sign of a system message
   *                             Признак системного сообщения
   *
   * @return {Promise<void>}      If the stop() function is executed,
   *                              then further routing stops
   *                              Если будет выполнена функция stop(),
   *                              то дальнейшая маршрутизация останавливается
   * @private
   */
  async _execRoutes({ws, route, act, data, mes, raw, isSystem = false}) {

    // Continue or stop further routing
    // Продолжить или остановить дальнейшую маршрутизацию
    let flStop = false;
    const stop = () => flStop = true;
    const groups = this.groups;

    // Incoming message awaiting response
    // Входящее сообщение ожидает ответ
    const awaitRes = pathExists(mes, 'system.awaitRes');
    const mesId = pathExists(mes, 'system.id');
    let res;

    // Sign whether the message passed routing
    // Признак прошло ли сообщение маршрутизацию
    let isMatch = false;

    // Determine which routing the message will go through, system or user
    // Определяем какую маршрутизацию сообщение будет проходить, системную или пользовательскую
    const routes = isSystem ? this._systemRoutes : this.routes;

    // We go through each route
    // Проходим каждый маршрут
    for (const routeEl of routes) {

      // If the message does not go through routing, then go to the next route
      // Если сообщение не проходит маршрутизацию, то переходим к следующему маршруту
      const handler = routeEl.match({route, act});
      if (!handler) continue;

      isMatch = true;

      // If routing is passed.
      // Define a synchronous or asynchronous handler.
      // Pass:
      // ws - Client, class WS client connection object
      // groups - Group manager class Groups
      // data - Message data
      // mes - Custom message route, act, data
      // stop - A synchronous function whose execution stops further routing
      // raw - Full message containing user message (mes) and system information
      // Если маршрутизация пройдена.
      // Определим синхронный или асинхронный обработчик.
      // Передаем:
      // ws - Клиент, объект клиентского соединения class WS
      // groups - Менеджер групп class Groups
      // data - Данные сообщения
      // mes - Пользовательское сообщение route, act, data
      // stop - Синхронная функция, выполнение которой останавливает дальнейшую маршрутизацию
      // raw - Полное сообщение, содержащее пользовательское сообщение (mes) и системную информацию
      const isAsync = funcIsAsync(handler);
      if (isAsync) {
        res = await handler({ws, groups, data, mes, stop, raw});
      } else {
        res = handler({ws, groups, data, mes, stop, raw});
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

    if (!isMatch) this.emit('noRouting', {server: this, ws, groups, data, mes, raw});

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
   * @param {Object} mes - The message contains route, act, data
   *                       Сообщение содержит route, act, data
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
    await this._execRoutes({ws, route, act, data, mes, raw});

  }

  /**
   * Client connection handler
   * Обработчик подключения клиентского соединения
   *
   * @param {Object} socket - Websocket client connection object
   *                          Объект клиентского соединения по websocket
   * @private
   */
  _connection(socket) {

    // Initialize the client connection socket object (class WS)
    // Инициализируем объект сокета клиентского соединения (class WS)
    const ws = this._initWS({socket});
    // When closing the connection, delete the client connection object everywhere
    // При закрытии соединения удаляем объект клиентского соединения везде
    ws.socket.on('close', () => {
      this.emit('closeClient', {server: this, client: ws});
      setImmediate(() => this._deleteClient({ws}))
    });
    // Add client connection (cache) to the list of clients
    // Добавляем в список клиентов клиентское соединение (кэш)
    this._addClient(ws);

    // Assign Incoming Message Handler
    // Назначаем обработчик входящих сообщений
    socket.onmessage = async (message) => {

      // Received Message
      // Пришедшее Сообщение
      let mes = pathExists(message, 'data', '{}');
      mes = JSON.parse(mes);

      const raw = message;
      const type = mes.type;
      const route = mes.route;
      const act = mes.act;
      const data = mes.data;

      // Depending on the message, select routing
      // В зависимости от сообщения выбираем маршрутизацию
      const isSystemMes = type === 'system';
      if (isSystemMes) {
        await this._systemRouting({mes, route, act, data, raw, ws});
      } else {
        await this._routing({mes, route, act, data, raw, ws});
      }

    }

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
   * @param {Object} mes - The message contains route, act, data
   *                       Сообщение содержит route, act, data
   *
   * @param {Object} raw - Full message, contains user message (mes) and system information
   *                       Полное сообщение, содержит пользовательское сообщение (mes) и системную информацию
   *
   * @return {Promise<void>}
   * @private
   */
  async _systemRouting({mes, route, act, data, raw, ws}) {

    // If the message is a response to a previously sent message, then process it
    // Если сообщение является ответом на ранее отправленное сообщение, то обработаем его
    const stop = this._processAwaitRes({ws, mes});
    if (stop) return;

    // If the previous processing steps did not stop the message, then execute routing
    // Если предыдущие этапы обработки не остановили сообщение, то выполним routing
    await this._execRoutes({ws, route, act, data, mes, raw, isSystem: true});
  }

  /**
   * We generate system routing
   * Генерируем системную маршрутизацию
   *
   * @private
   */
  _generateSystemRoutes() {

    // Clone Authentication
    // Аутентификации клонов
    generateAuthRoutes.call(this);
    // Communication of clone managers
    // Общение менеджеров клонов
    generateCloneRoutes.call(this);
    // Communication of group managers
    // Общение менеджеров групп
    generateGroupRoutes.call(this);

  }

  /**
   * Add client
   * Добавить клиента
   *
   * @param {Object} ws - Client Connection Object (class WS)
   *                      Объект клиентского соединения (class WS)
   * @private
   */
  _addClient(ws) {

    const id = ws.id;
    this.clients[id] = ws;

  }

  /**
   * Delete Client
   * Удалить клиента
   *
   * @param {Object} ws - Client Connection Object (class WS)
   *                      Объект клиентского соединения (class WS)
   *
   * @param {string} [id] - Client id
   *                        id клиента
   * @private
   */
  _deleteClient({ws, id}) {

    const client = ws || this.clients[id];
    if (!client) return;

    // Stop the client connection
    // Останавливаем клиентское соединение
    client.stop();
    // Remove From Subscribers
    // Удаляем из подписчиков
    this.groups.deleteSubscriber({ws: client});
    // Remove from clients
    // Удаляем из клиентов
    delete this.clients[client.id];
    // Delete the client connection
    // Удаляем клиентское соединение
    this.wss.clients.delete(client.socket);

  }

  /**
   * Run periodic deletion of clients with a broken connection
   * Запускаем периодическое удаление клиентов с разорванным соединением
   * @private
   */
  _startClearOfflineClients() {

    if (this._clearOfflineClientsId) {
      clearInterval(this._clearOfflineClientsId);
      this._clearOfflineClientsId = null;
    }

    const id = setInterval(async () => await this.clearOfflineClients(), this.timeouts.clearOfflineClients);
    this._clearOfflineClientsId = id;

  }

}