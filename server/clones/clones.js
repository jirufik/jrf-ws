const EventEmitter = require('events').EventEmitter;
const Client = require('../../client/backendClient');
const parallelProcessing = require('jrf-pip');

/**
 * The Clone class is responsible for communicating the clones with each other.
 * Класс Клон отвечает за общение клонов друг с другом
 *
 * @type {Clones}
 */
module.exports = class Clones extends EventEmitter {

  /**
   * Create Clone Manager Object
   * Создать объект менеджер клонов
   *
   * @param {Object} server - Server object
   *                          Объект сервера
   * @param {number} interval - The frequency with which to poll remote clones (milliseconds)
   *                            Периодичность с которой опрашивать удаленные клоны (миллисекунды)
   */
  constructor({server = {}, interval = 5000} = {}) {

    super();

    this.server = server;
    this.interval = interval;
    // Client connections to remote clones
    // Клиентские соединения к удаленным клонам
    this.clones = new Map();
    this.cache = {
      // An object whose keys are id clones. The key value is clone information.
      // Объект, ключами которого являются id клонов. Значение ключа это информация о клоне.
      id: {},
      // An object whose keys are the url of the clones. The key value is clone information.
      // Объект, ключами которого являются url клонов. Значение ключа это информация о клоне.
      url: {},
      // An object whose keys are id of active clones (accessible over the network). The key value is clone information.
      // Объект, ключами которого являются id активных клонов (доступные по сети). Значение ключа это информация о клоне.
      active: {}
    };
    this._idGetRemoteClones = null;

    this.on('add', () => {
    });
    this.on('delete', () => {
    });
    this.on('start', () => {
    });
    this.on('stop', () => {
    });
    this.on('error', () => {
    });

  }

  /**
   * Add new remote clone
   * Добавить новый удаленный клон
   *
   * @param {string} id - remote clone id
   *                      id удаленного клона
   *
   * @param {string} url - remote clone connection url
   *                       url подключения к удаленному клону
   *
   * @param {function} authFnOut - Function that returns a value for authentication on a remote clone
   *                               for example, a token that authenticates a remote clone when connected to it
   *                               Функция возвращающая значение для аутентификации на удаленном клоне
   *                               например токен который аутентифицирует удаленный клон, при подключении к нему
   */
  add({id, url, authFnOut}) {

    // If we try to add ourselves to the clone manager, then we throw an exception
    // Если пытаемся в менеджер клонов добавить самого себя, то вызываем исключение
    const isMe = id === this.server.id;
    if (isMe) {
      const error = new Error(`Clone cannot add yourself id: ${id}; url: ${url}`);
      this.emit('error', {clone: this, error});
      throw error;
    }

    this.emit('add', {clone: this});
    // If the clone was added earlier, then update the clone data
    // Если клон был добавлен ранее, то обновляем данные клона
    const cacheClone = this._cloneInCache({id, url});
    if (cacheClone) {

      const clientClone = this.clones.get(id);
      clientClone.authFnOut = authFnOut;

      // If the clone address has changed, then update
      // Если изменился адрес клона, обновим
      const urChanged = url !== cacheClone.url;
      if (urChanged) {
        cacheClone.url = url;
        clientClone.url = url;
      }

      if (this.server.active) {
        clientClone.stop();
        clientClone.start();
      }

      return;
    }

    // Create a client to connect to the remote clone
    // Создаем клиента для подключения к удаленному клону
    authFnOut = authFnOut || this.server.authFnOut;
    const clone = new Client({id, url, authFnOut, isClone: true});
    this.clones.set(id, clone);

    // Add a clone to id, url cache
    // Добавляем клона в id, url кэш
    this._addCloneInCache(clone);

    // Update the cache, depending on the availability of the remote clone over the network
    // Обновляем кэш, в зависимости от доступности удаленного клона по сети
    clone.on('open', ({client}) => this._updateCacheActive(client));
    clone.on('close', ({client}) => this._updateCacheActive(client));

    // If the server is active (running), then start the clone client
    // Если сервер активен (запущен), то запускаем клиента клона
    if (this.server.active) {
      clone.start();
    }

  }

  /**
   * Delete remote clone
   * Удалить удаленный клон
   *
   * @param {string} id - clone id
   *                      id клона
   */
  delete({id}) {

    // Check if there is a clone in the clone manager
    // Проверяем есть ли клон в менеджере клонов
    const clone = this.clones.get(id);
    this.emit('delete', {clone: this});
    if (!clone) return;

    // End the clone client and delete all data about the clone
    // Завершаем работу клиента клона и удаляем все данные о клоне
    clone.stop();
    this._deleteCloneInCache(clone);
    this.clones.delete(id);

  }

  /**
   * Run poll of deleted clones
   * Запустить опрос удаленных клонов
   */
  start() {

    // For each clone, launch a client
    // Для каждого клона запускаем клиента
    for (const clone of this.clones.values()) {
      if (!clone.active) clone.start();
    }

    // Run a poll of remote clones. About providing information about deleted clones known to them.
    // Запускаем опрос удаленных клонов. О предоставлении информации об удаленных клонов известных им.
    const id = setInterval(async () => {

      // Give the remote clone data about the current clone (server)
      // Передадим удаленному клону, данные о текущем клоне(сервере)
      const id = this.server.id;
      const url = this.server.url;

      await this.getRemoteClones({id, url});

    }, this.interval);

    this._idGetRemoteClones = id;

    this.emit('start', {clone: this});

  }

  /**
   * Stop polling for deleted clones
   * Остановить опрос удаленных клонов
   */
  stop() {

    if (this._idGetRemoteClones) {
      clearInterval(this._idGetRemoteClones);
      this._idGetRemoteClones = null;
    }

    for (const clone of this.clones.values()) {
      if (clone.active) clone.stop();
    }

    this.emit('stop', {clone: this});

  }

  /**
   * Update Clone List In Clone Manager
   * Обновить список клонов в менеджере клонов
   *
   * @param {Array} clones - An array of clone objects.
   *                         The clone object must contain the id and url of the clone.
   *                         Массив объектов клонов.
   *                         Объект клона должен содержать id и url клона.
   */
  updateClones(clones) {

    for (const clone of clones) {

      const found = this.cache.id[clone.id];
      if (found) continue;

      const isMe = clone.id === this.server.id;
      if (isMe) continue

      const id = clone.id;
      const url = clone.url;
      this.add({id, url, authFnOut: this.server.authFnOut});

    }

  }

  /**
   * Get information about clone (s)
   * Получить информацию о клоне(ах)
   *
   * @param {string} [id] - clone id
   *                        id клона
   *
   * @param {string} [url] - clone url
   *                         url клона
   *
   * @param {boolean} [active] - Get information about active clones (available online)
   *                             Получить информацию об активных клонах (доступных по сети)
   *
   * @return {unknown[]|*} - Will return information about the clone (s) depending on the input parameters
   *                         Вернет информацию о клоне(ах) в зависимости от входных параметров
   */
  get({id, url, active} = {}) {

    if (id) return this.cache.id[id];
    if (url) return this.cache.url[url];
    if (active) return Object.values(this.cache.active);

    return Object.values(this.cache.id);

  }

  /**
   * Receive from clones deleted, a list of clones available to them.
   * Add to the manager of clones previously unknown clones.
   * Получить от удаленных клонов, список доступных им клонов.
   * Добавить в менеджер клонов, ранее не известных клонов.
   *
   * @param {string} [id] - The server id (this clone for remote ones)
   *                        id сервера (этого клона для удаленных)
   *
   * @param {stirng} [url] - The server url (this clone for remote ones)
   *                         url сервера (этого клона для удаленных)
   *
   * @param {boolean} [active = true] - Get a list of active clones only
   *                                    Получить список только активных клонов
   *
   * @return {Promise<void>}
   */
  async getRemoteClones({id, url, active = true} = {}) {

    if (!this.clones.size) return;

    // Cloned Clients
    // Клиенты удаленных клонов
    const clones = Array.from(this.clones.values());
    // List of clones returned by deleted clones
    // Список клонов, который вернули удаленные клоны
    let remoteClones = [];
    // Counter of the number of not processed requests
    // When it will be 0, then all remote clones provided information
    // Счетчик количества не обработанных запросов
    // Когда будет равен 0, значит все удаленные клоны предоставили информацию
    let count = 0;

    // Callback function to handle the response received from the remote clone
    // Функция обратного вызова для обработки ответа поступившего от удаленного клона
    const cbAfterRes = ({error, res}) => {

      // Reduce the counter since response received
      // Уменьшаем счетчик т.к. ответ получен
      --count;

      // Add to the list information about the clones available to the remote clone
      // Добавляем в список информацию о клонах доступных удаленному клону
      if (res) {
        remoteClones = remoteClones.concat(res);
      }

      // If the answers came from all clones, then add previously unknown clones to the manager
      // Если ответы пришли от всех клонов, то добавляем в менеджер ранее не известных клонов
      if (count > 0) return;

      this.updateClones(remoteClones);

    };

    // Pass information about known clones to the remote clone
    // Передаем удаленному клону информацию о известных клонах
    const data = {
      active,
      clones: Object.values(this.cache.id),
      fromClone: id
    };

    // If the server has an address for connection, then pass it to the remote clone
    // Если у сервера указан адрес для подключения, то передадим его удаленному клону
    if (url) {
      data.clones.push({id, url});
    }

    // Function to send a system message to a remote clone
    // Функция отправки системного сообщения удаленному клону
    const processingFn = async ({value}) => {

      const clone = value;

      // Create a system message to provide a list of available clones
      // Создаем системное сообщение о предоставлении списка доступных клонов
      const mes = {
        route: 'clones',
        act: 'get',
        data,
        timeout: 1000,
        cbAfterRes
      };

      mes.data.toClone = clone.id;

      // Send a message to the remote clone
      // Отправляем удаленному клону сообщение
      await clone.sendMes(mes);

      // Increase the response expectation counter
      // Увеличиваем счетчик ожидания ответов
      ++count;

    };

    // Run parallel sending message to remote clones
    // Запускаем параллельную отправку сообщения удаленным клонам
    await parallelProcessing({arrayValues: clones, processingFn});

  }

  _updateCacheActive(clone) {

    if (clone.active) {
      this.cache.active[clone.id] = clone.getInfo();
    } else {
      delete this.cache.active[clone.id];
    }

  }

  _deleteCloneInCache(clone) {

    delete this.cache.id[clone.id];
    delete this.cache.url[clone.url];

  }

  _addCloneInCache(clone) {

    this.cache.id[clone.id] = clone.getInfo();
    this.cache.url[clone.url] = clone.getInfo();

  }

  _cloneInCache({id, url}) {
    return this.cache.id[id] || this.cache.url[url];
  }

}