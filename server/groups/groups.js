const EventEmitter = require('events').EventEmitter;
const Group = require('../group/group');
const parallelProcessing = require('jrf-pip');

/**
 * Group Class (group manager)
 * Класс Группы (менеджер групп)
 *
 * @type {Groups}
 */
module.exports = class Groups extends EventEmitter {

  /**
   * Create Group Manager
   * Создать менеджер групп
   *
   * @param {Object} server - Server object
   *                          Объект сервера
   */
  constructor({server}) {

    super();

    this.server = server;
    // List of groups. The key is the group id. Value - Group Object
    // Список групп. Ключ - id группы. Значение - объект группы
    this.groups = {};
    // Group cache. The key is the group id. Value - an array of subscribers id
    // Кэш групп. Ключ - id группы. Значение - массив id подписчиков
    this.cache = {
      groups: null
    };

    this.on('add', () => {
    });
    this.on('delete', () => {
    });
    this.on('error', () => {
    });

  }

  /**
   * Add a new group to the group manager
   * Добавить новую группу в менеджер групп
   *
   * @param {string} id - Group id
   *                      id группы
   *
   * @param {Object} [ws] - Client connection subscriber. If set, the subscriber will be subscribed to the added group
   *                        Клиентское соединения подписчика. Если задано, то подписчик будет подписан на добавляемую группу
   *
   * @param {Object} [data] - An object with any user group information
   *                   Объект с любой пользовательской информацией о группе
   */
  add({id, ws, data}) {

    if (!id) {
      const error = new Error('Group id not set');
      this.emit('error', {groups: this, error});
      throw error;
    }

    const group = this._initGroup({id, data});

    if (ws) group.addSubscriber(ws);

    this.updateCache({id});

    this.emit('add', {group, groups: this});

  }

  /**
   * Add subscriber to group
   * Добавить подписчика в группу
   *
   * @param {string} id - Group id
   *                      id группы
   *
   * @param {Object} ws - Subscriber Client Connection Object
   *                      Объект клиентского соединения подписчика
   */
  addSubscriber({id, ws}) {

    if (!id) {
      const error = new Error('Group id not set');
      this.emit('error', {groups: this, error});
      throw error;
    }

    if (!ws) {
      const error = new Error('Not defined subscriber');
      this.emit('error', {groups: this, error});
      throw error;
    }

    const group = this._initGroup({id});
    group.addSubscriber(ws);

    this.updateCache({id});

  }

  /**
   * Get group (s) data
   * Получить данные групп(ы)
   *
   * @param {string} id - Group id
   *                      id группы
   *
   * @return {null|*} - Will return group cache, if id is specified, then group cache
   *                    Вернет кэш групп, если задан id, то кэш группы
   */
  get({id} = {}) {

    if (!this.cache.groups) this.updateCache({refresh: true});

    if (!id) return this.cache.groups;

    return this.cache.groups[id];

  }

  /**
   * Delete group, send clones command to delete group
   * Удалить группу, послать клонам команду удалить группу
   *
   * @param {string} id - Group id
   *                      id группы
   *
   * @param {Array} [excludeClones] - array of id of clones to which other clones have already been sent a delete message
   *                                  массив id клонов, которым уже послали сообщение о удалении другие клоны
   */
  delete({id, excludeClones}) {

    if (!id) {
      const error = new Error('Group id not set');
      this.emit('error', {groups: this, error});
      throw error;
    }

    // Remove all subscribers from the group
    // Удалим всех подписчиков из группы
    const group = this._initGroup({id});
    if (group) {
      group.deleteSubscriber();
    }

    this.emit('delete', {group, groups: this});

    // Delete the group
    // Удалим группу
    delete this.groups[id];

    // Update The Cache
    // Обновим кэш
    this.updateCache({id, del: true});

    // Send clones a system message about deleting the group, excluding excludeClones from the list
    // Пошлем клонам системное сообщение об удалении группы, исключив из рассылки excludeClones
    Promise.resolve({id, excludeClones})
      .then(async ({id, excludeClones}) => {
        await this._deleteToClones({id, excludeClones});
      })
      .catch();

  }

  /**
   * Delete Subscriber (s)
   * Удалить подписчика(ов)
   *
   * @param {string} [id] - group id, if no group is specified, then the subscriber is deleted from all groups
   *                        id группы, если группа не задана, то подписчик удаляется из всех групп
   *
   * @param {Object} ws - Subscriber client connection object
   *                      Объект клиентского соединения подписчика
   */
  deleteSubscriber({id, ws}) {

    if (!ws) {
      const error = new Error('Not defined subscriber');
      this.emit('error', {groups: this, error});
      throw error;
    }

    if (!id) {

      Promise.resolve(ws)
        .then(async (ws) => {
          await this._deleteSubscriberInAllGroups(ws)
        })
        .catch();

      return;
    }

    const group = this._initGroup({id});
    this.updateCache({id, del: true});
    if (!group) return;

    group.deleteSubscriber(ws);
    this.updateCache({id, del: true});

  }

  /**
   * Удалить подписчика из всех групп, выполняется параллельно
   *
   * @param {Object} ws - Subscriber client connection object
   *                      Объект клиентского соединения подписчика
   *
   * @return {Promise<void>}
   * @private
   */
  async _deleteSubscriberInAllGroups(ws) {

    const parallel = 1000;
    const groups = Object.values(this.groups);

    const nextValueFn = ({value}) => {
      const group = value;
      if (!group) return true;
    };

    const processingFn = ({value}) => {
      const group = value;
      this.deleteSubscriber({id: group.id, ws});
    };

    await parallelProcessing({arrayValues: groups, nextValueFn, processingFn, parallel});

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
   * @param {number} [timeout = 10000] - Time (ms) to wait for a response after which an exception will be raised
   *                                     Время (мс) ожидания ответа, по истечению которого будет вызвано исключение
   *
   * @param {string} [withoutId] - whose client id to exclude from the mailing list
   *                               id клиента которого исключить из рассылки
   *
   * @param {number} sendParallel - The number of subscribers to whom to send a message in parallel
   *                                Количество подписчиков которым параллельно рассылать сообщение
   *
   * @param {Array} [excludeClones] - array of id of clones to which other clones have already been sent a message
   *                                  массив id клонов, которым уже послали сообщение другие клоны
   * @return {Promise<void>}
   */
  async sendMes({
                  id,
                  route,
                  act,
                  data,
                  timeout,
                  withoutId,
                  excludeClones,
                  sendParallel = 1000
                }) {

    // Send a message to all groups
    // Послать сообщение всем группам
    if (!id) {

      const groups = Object.values(this.groups);
      for (const group of groups) {
        await group.sendMes({route, act, data, timeout, withoutId, sendParallel});
      }

    }

    // Send a message to the list of groups
    // Послать сообщение списку групп
    if (Array.isArray(id)) {

      for (const idGroup of id) {

        const group = this.groups[idGroup];
        if (!group) continue;

        await group.sendMes({route, act, data, timeout, withoutId, sendParallel});
      }

    }

    // Send a message to the group
    // Послать сообщение в группу
    if (typeof id === "string") {

      const group = this.groups[id];

      if (group) {
        await group.sendMes({route, act, data, timeout, withoutId, sendParallel});
      }

    }

    // Send message to clones
    // Послать сообщение клонам
    await this._sendMesToClones({id, route, act, data, withoutId, excludeClones});

  }

  /**
   * Refresh Groups Cache
   * Обновить кэш групп
   *
   * @param {string} [subscriber] - Group id
   *                                       id группы
   *
   * @param {boolean} [del = false] - Remove group
   *                                  Удалить группу
   * @param {boolean} [refresh = false] - Refresh Cache
   *                                      Обновить кэш
   *
   * @return {{subscribers: Set<any>, group: string}} - Вернет кэш содержащий id групп и id подписчиков
   */
  updateCache({id, del = false, refresh = false}) {

    if (!this.cache.groups) this.cache.groups = {};

    if (refresh) {

      this.clearCache();
      this.cache.groups = {};

      const groups = Object.values(this.groups);
      for (const group of groups) {
        const subscribers = group.getSubscribers();
        this.cache.groups[group.id] = subscribers;
      }

      return this.cache;

    }

    if (del) {
      delete this.cache.groups[id];
      return this.cache;
    }

    const group = this.groups[id];
    if (!group) return;

    this.cache.groups[id] = group.getSubscribers();

    return this.cache;

  }

  clearCache() {

    this.cache.groups = null;

  }

  /**
   * Послать сообщение клонам
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
   * @param {number} [timeout = 10000] - Time (ms) to wait for a response after which an exception will be raised
   *                                     Время (мс) ожидания ответа, по истечению которого будет вызвано исключение
   *
   * @param {string} [withoutId] - whose client id to exclude from the mailing list
   *                               id клиента которого исключить из рассылки
   *
   * @param {Array} [excludeClones] - array of id of clones to which other clones have already been sent a message
   *                                  массив id клонов, которым уже послали сообщение другие клоны
   * @return {Promise<void>}
   * @private
   */
  async _sendMesToClones({id, route, act, data, withoutId, excludeClones}) {

    // Parallel to 1000 clones
    // Параллельно рассылаем 1000 клонам
    const parallel = 1000;
    const clones = this.server.clones;

    // Prepare a list of excludeClones, add active clones to it (accessible over the network)
    // so that the clones do not resend the message to those clones to which it has already been sent
    // Подготавливаем список excludeClones, добавляем в него активных клонов (доступных по сети)
    // чтобы клоны повторно не рассылали сообщение тем клонам, которым его уже послали
    excludeClones = this._initExcludeClones({excludeClones});
    const activeClones = this._initActiveClones({excludeClones});

    // Send a system message to the clone
    // Посылаем системно сообщение клону
    const processingFn = async ({value}) => {

      // Check that the clone is available
      // Проверяем что клон доступен
      const cloneId = value;
      const clone = clones.clones.get(cloneId);
      if (!clone) return true;

      // Create a system message
      // Создаем системное сообщение
      const mes = {
        type: 'system',
        route: 'groups',
        act: 'sendMes',
        data: {
          id,
          route,
          act,
          data,
          withoutId,
          excludeClones
        }
      };

      // Send a message
      // Посылаем сообщение
      await clone.sendMes(mes);

    };

    // Distribute clones in parallel
    // Выполняем рассылку клонам параллельно
    await parallelProcessing({arrayValues: activeClones, processingFn, parallel});

  }

  /**
   * Send clone system message about group deletion
   * Послать клонам системное сообщение об удалении группы
   *
   * @param {string} id - Group id
   *                      id группы
   *
   * @param {Array} [excludeClones] - array of id of clones to which other clones have already been sent a message
   *                                  массив id клонов, которым уже послали сообщение другие клоны
   * @return {Promise<void>}
   * @private
   */
  async _deleteToClones({id, excludeClones}) {

    // Parallel to 1000 clones
    // Параллельно рассылаем 1000 клонам
    const parallel = 1000;
    const clones = this.server.clones;

    // Prepare a list of excludeClones, add active clones to it (accessible over the network)
    // so that the clones do not resend the message to those clones to which it has already been sent
    // Подготавливаем список excludeClones, добавляем в него активных клонов (доступных по сети)
    // чтобы клоны повторно не рассылали сообщение тем клонам, которым его уже послали
    excludeClones = this._initExcludeClones({excludeClones});
    const activeClones = this._initActiveClones({excludeClones});

    // Send a system message to the clone
    // Посылаем системно сообщение клону
    const processingFn = async ({value}) => {

      // Check that the clone is available
      // Проверяем что клон доступен
      const cloneId = value;
      const clone = clones.clones.get(cloneId);
      if (!clone) return true;

      // Create a system message
      // Создаем системное сообщение
      const mes = {
        type: 'system',
        route: 'groups',
        act: 'delete',
        data: {
          id,
          excludeClones
        }
      };

      // Send a message
      // Посылаем сообщение
      await clone.sendMes(mes);

    };

    // Distribute clones in parallel
    // Выполняем рассылку клонам параллельно
    await parallelProcessing({arrayValues: activeClones, processingFn, parallel});

  }

  /**
   * We initialize the list of clones that you want to exclude from the mailing list.
   * Инициализируем список клонов, которых требуется исключить из рассылки
   *
   * @param {null|string|Array} [excludeClones] - id of clone (s) to be excluded
   *                                              id клона(ов) которые требуется исключить
   * @return {*}
   * @private
   */
  _initExcludeClones({excludeClones}) {

    // Create an array of exception id
    // Создаем массив id исключений
    if (excludeClones) {
      excludeClones = Array.isArray(excludeClones) ? excludeClones : [excludeClones];
    } else {
      excludeClones = [];
    }

    return excludeClones;

  }

  /**
   * Complete the list of excludeClones with active clones, return a list of active clones
   * Дополнить список excludeClones, активными клонами, вернуть список активных клонов
   *
   * @param {Array} excludeClones - List of clones to be excluded from the mailing list
   *                                Список клонов которых требуется исключить из рассылки
   *
   * @return {string[]} - Will return an id array of active clones that were not in excludeClones
   *                      Вернет массив id активных клонов, которых не было в excludeClones
   * @private
   */
  _initActiveClones({excludeClones}) {

    // Get a list of active clones
    // Получим список активных клонов
    const clones = this.server.clones;
    let activeClones = clones.get({active: true}).map(clone => clone.id);

    // Exclude the current clone
    // Исключим текущий клон
    excludeClones.push(this.server.id);

    // Leave only active clones to which the message has not yet been sent
    // Оставим только тех активных клонов, которым еще не было послано сообщение
    activeClones = activeClones.filter(cloneId => {

      const notExclude = !excludeClones.includes(cloneId);
      if (notExclude) {
        // Add to the list excludeClones, those clones to whom we will send a message
        // Дополним список excludeClones, теми клонами, которым отправим сообщение
        excludeClones.push(cloneId);
      }

      return notExclude;

    });

    return activeClones;

  }

  /**
   * We initialize the group, if there is no group with such id, then create it. We will return the group by id.
   * Инициализируем группу, если группы с таким id нет, то создаем. Вернем группу по id.
   *
   * @param {string} id - Group id
   *                      id группы
   * @param {Object} [data] - An object with any user group information
   *                          Объект с любой пользовательской информацией о группе
   * @private
   */
  _initGroup({id, data}) {

    let group = this.groups[id];
    if (!group) {
      group = new Group({id, data});
      this.groups[id] = group;
    }

    return group;

  }

}
