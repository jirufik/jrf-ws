const EventEmitter = require('events').EventEmitter;
const generateId = require("../../utils/generateId");
const funcIsAsync = require('../../utils/funcIsAsync');
const wait = require("../../utils/wait");

/**
 * The class is a wrapper over the websocket connection of the client and server.
 * Класс является оберткой над websocket соединением клиента и сервера
 *
 * Implements different types of sending messages:
 * - Asynchronous message sending
 * - Asynchronous message sending with callback function
 * - Asynchronous sending messages in a synchronous style, with the ability to set the timeout
 *
 * Реализует разные виды отправки сообщений:
 *  - Асинхронную отправку сообщения
 *  - Асинхронную отправку сообщения с функцией обратного вызова
 *  - Асинхронную отправку сообщения в синхронном стиле, с возможностью задать timeout
 *
 * All types of sending messages, support directions:
 * - Client -> Server
 * - Server -> Client
 *
 * Все виды отправки сообщений, поддерживают направления:
 *  - Клиент -> Сервер
 *  - Сервер -> Клиент
 *
 * @type {WS}
 */
module.exports = class WS extends EventEmitter {

  /**
   * Create a wrapper over a websocket connection
   * Создать обертку над websocket соединением
   *
   * @param {Object} socket - Connection websocket object from ws package
   *                          Объект websocket соединения из пакета ws
   *
   * @param {Object} [data] - Any user data for a client connection
   *                          Любые пользовательские данные для клиентского соединения
   *
   * @param {boolean} [clone] - A sign that a client connection is connecting to a clone
   *                            Признак того что клиентское соединение является подключением к клону
   */
  constructor({socket, data = {}, clone}) {

    super();

    // Connection id is automatically created
    // Автоматически создается id соединения
    this.id = generateId();
    this.socket = socket;
    this.data = data;
    this.clone = clone;
    // List of groups the client is subscribed to
    // Список групп на которые подписан клиент
    this.groups = new Set();
    // default timeouts
    // Timeouts по умолчанию
    this.timeouts = {
      // How long to wait for a response to the sent message
      // for callback function or synchronous style
      // Сколько времени ожидать ответ на отправленное сообщение
      // для функции обратного вызова или синхронного стиля
      awaitRes: 10000,
      // Asynchronous pause between iterations of checking the response to a message
      // Асинхронная пауза между итерациями проверки ответа на сообщение
      awaitCycle: 15
    };
    // Waiting queue in which the data of messages for which
    // answer expected
    // Очередь ожидания, в которой хранятся данные сообщений, на которые
    // ожидается ответ
    this._awaitQueue = {};

    this.on('stop', () => {
    });
    this.on('error', () => {
    });

  }

  /**
   * Send a message to a client over a client connection
   * Отправить сообщение клиенту по клиентскому соединению
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
  async sendMes({
                  route,
                  act,
                  data,
                  opts = {},
                  cbAfterRes,
                  cbAfterSend = () => {
                  },
                  awaitRes = false,
                  timeout = 10000,
                  cycleTimeout = 15,
                  idMesAwaitRes,
                  type
                }) {

    // Generate a message
    // Генерируем сообщение
    const id = generateId();
    const addAwait = awaitRes || cbAfterRes;
    const mes = this._generateMes({
      id,
      route,
      act,
      data,
      addAwait,
      idMesAwaitRes,
      type
    });

    // Send a message that does not require a response
    // Отправляем сообщение не требующее ответа
    const noAwait = !awaitRes && !cbAfterRes;
    if (noAwait) {
      this.socket.send(JSON.stringify(mes), opts, cbAfterSend);
      return;
    }

    // Add the message to the waiting queue for the response,
    // putting down a sign that the answer is not received
    // Добавляем сообщение в очередь ожидания ответа,
    // проставив признак того что ответ не получен
    this._awaitQueue[id] = {
      created: Date.now(),
      gotRes: false,
      awaitRes,
      cbAfterRes,
      res: null
    };

    // Send a message
    // Отправляем сообщение
    this.socket.send(JSON.stringify(mes), opts, cbAfterSend);

    // If callback is given, then we do not expect a response
    // Если задан callback, то не ожидаем ответ
    if (!awaitRes) {

      // Run the response wait loop for callback
      // Запускаем цикл ожидания ответа для callback
      setImmediate(async () => {
        await this._awaitRes({id, timeout, cycleTimeout});
      });

      return;
    }

    // If a response wait is specified, then start a response wait loop
    // Если задано ожидание ответа, то запускаем цикл ожидания ответа
    timeout = timeout || this.timeouts.awaitRes;
    cycleTimeout = cycleTimeout || this.timeouts.awaitCycle;
    const res = await this._awaitRes({id, timeout, cycleTimeout});

    return res;

  }

  stop() {
    this.socket.close();
    this.emit('stop', {ws: this});
  }

  /**
   * Fill in the response to the sent message
   * Заполнить ответ на отправленное сообщение
   *
   * @param {string} id - id of the message to which the response is filled
   *                      id сообщения на которое заполняется ответ
   *
   * @param {*} res - reply to sent message
   *                  ответ на отправленное сообщение
   */
  fillRes({id, res}) {

    const mes = this._awaitQueue[id];
    if (!mes) return false;
    if (mes.gotRes) return false;

    mes.gotRes = true;
    mes.res = res;

    return true;

  }

  async _processRes({id}) {

    const mes = this._awaitQueue[id];
    const res = mes.res;
    const awaitRes = mes.awaitRes;
    // Remove from the queue
    // Удалим из очереди
    delete this._awaitQueue[id];

    // If you expect a response to the sent message, we will return a response
    // Если ожидается ответ на отправленное сообщение вернем ответ
    if (awaitRes) {
      return res;
    }

    // If the response should handle callback
    // Если ответ должен обработать callback
    const cb = mes.cbAfterRes;
    const isAsync = funcIsAsync(cb);
    if (isAsync) {
      await cb({error: null, res: mes.res});
    } else {
      cb({error: null, res: mes.res});
    }

  }

  async _processTimeout({id, timeout}) {

    const mes = this._awaitQueue[id];
    const awaitRes = mes.awaitRes;
    const error = new Error(`Message id ${id} timed out ${timeout}`);
    // Remove from the queue
    // Удалим из очереди
    delete this._awaitQueue[id];

    this.emit('error', {ws: this, error});
    // If a response is expected, throw an exception
    // Если ожидается ответ вызовем исключение
    if (awaitRes) {
      throw error;
    }

    // If the answer should handle the callback, then we throw an exception in the callback
    // Если ответ должен обработать callback, то передаем в callback исключение
    const cb = mes.cbAfterRes;
    const isAsync = funcIsAsync(cb);
    if (isAsync) {
      await cb({error, res: null});
    } else {
      cb({error, res: null});
    }

  }

  async _awaitRes({id, timeout, cycleTimeout}) {

    const startTime = Date.now();


    // Run a response wait loop with asynchronous pauses
    // Запускаем цикл ожидания ответа с асинхронными паузами
    while (true) {

      // Pause the loop
      // Приостанавливаем цикл на паузу
      await wait(cycleTimeout);

      // Check if the message has been removed from the queue
      // Проверяем не удалено ли сообщение из очереди
      const mes = this._awaitQueue[id];
      if (!mes) throw new Error('Message not found in queue');

      // If the response to the message came, if it is a callback, then execute it,
      // otherwise return it and remove it from the wait queue
      // Если ответ на сообщение пришел, если это callback, то выполнем его,
      // иначе возвращаем его и удаляем из очереди ожидания
      if (mes.gotRes) {
        return await this._processRes({id});
      }

      // If the timeout expires, throw an exception
      // and remove from the waiting queue
      // Если время ожидания вышло вызываем исключение
      // и удаляем из очереди ожидания
      const curTime = Date.now();
      const diff = curTime - startTime;
      const isTimeout = diff >= timeout;

      // Handle timeout, if a response is expected then an exception is thrown,
      // otherwise an error is sent to callback
      // Обработаем timeout, если ожидается ответ тогда вызывается исключение,
      // иначе в callback передается ошибка
      if (isTimeout) {
        await this._processTimeout({id, timeout});
        return;
      }

    }

  }

  /**
   * We will generate a message to send
   * Сгенерируем сообщение для отправки
   *
   * @param {string} [id = generateId()] - message id
   *                                       id сообщения
   *
   * @param {string} [uid = generateId()] - uid of the message, if the message goes through clones then uid passes
   *                                        throughout the clone chain
   *                                        uid сообщения, если сообщение идет по клонам то uid проходит
   *                                        по всей цепочке клонов
   * @param {string} [route] - route
   *                           путь
   *
   * @param {string} [act] - action to be taken relative to the path
   *                         действие которое требуется выполнить относительно пути
   *
   * @param {*} [data] - data to be sent
   *                     данные которые требуется отправить
   *
   * @param {boolean} [addAwait] - Add system information from the fact that the message needs to be answered
   *                               Добавить системную информацию от том что на сообщение требуется ответить
   *
   * @param {string} [idMesAwaitRes] - id of the message to which the response is sent
   *                                   id сообщения на которое отправляется ответ
   *
   * @param {string} [type] - Message Type:
   *                          message - user message type
   *                          system - type of system message (internal protocol)
   *                          Тип сообщения:
   *                          message - тип пользовательского сообщения
   *                          system  - тип системного сообщения (внутренний протокол)
   *
   * @return {string} - generated message
   *                    сгенерированное сообщение
   * @private
   */
  _generateMes({
                 id = generateId(),
                 uid = generateId(),
                 route,
                 act,
                 data,
                 addAwait,
                 idMesAwaitRes,
                 type
               }) {

    // Add ws to the message system data
    // Добавим ws в системные данные сообщения
    const ws = {
      id: this.id
    };

    // Add system message data
    // Добавим системные данные сообщения
    const system = {
      id,
      uid,
      created: new Date(),
      ws
    };

    // If you need an answer, then put down a sign of waiting for a response
    // Если требуется ответ, то проставим признак ожидания ответа
    if (addAwait) system.awaitRes = true;

    // id message to which the response is sent
    // id сообщение на которое отправляется ответ
    if (idMesAwaitRes) system.idMesAwaitRes = idMesAwaitRes;

    const setType = this.clone ? 'system' : 'message';
    type = type || setType;

    // Form the message
    // Формируем сообщение
    const mes = {
      type,
      route,
      act,
      data,
      system
    };

    return mes;

  }

}