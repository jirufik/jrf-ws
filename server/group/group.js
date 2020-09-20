const EventEmitter = require('events').EventEmitter;
const pathExists = require('jrf-path-exists');
const parallelProcessing = require('jrf-pip');

/**
 * The Group class
 * Класс Группа
 *
 * @type {Group}
 */
module.exports = class Group extends EventEmitter {

  /**
   * Create group
   * Создать группу
   *
   * @param {string} id - Group id
   *                      id группы
   *
   * @param {Object} [data] - An object with any user group information
   *                          Объект с любой пользовательской информацией о группе
   */
  constructor({id, data}) {

    super();

    if (!id) throw new Error('Group id not set');

    this.id = id;
    this.data = data;
    // Group subscribers in this clone
    // key - id of subscriber client connection (ws)
    // value is the client connection of the subscriber (ws)
    // Подписчики группы в данном клоне
    // ключ - id клиентского соединения подписчика (ws)
    // значение - клиентское соединение подписчика (ws)
    this.subscribers = {};
    // The cache contains the group id and group subscribers id (ws)
    // Кэш содержит id группы и id подписчиков группы (ws)
    this.cache = {
      group: this.id,
      subscribers: new Set()
    };

    this.on('add', () => {
    });
    this.on('delete', () => {
    });
    this.on('error', () => {
    });

  }

  /**
   * Добавить подписчика
   *
   * @param {Object} ws - Объект клиентского соединения
   */
  addSubscriber(ws) {

    // Add the group to the list of subscriber groups
    // Добавляем группу в список групп подписчика
    const id = ws.id;
    ws.groups.add(this.id);

    const subscriber = this.subscribers[id];
    // Add a subscriber (client connection) to the list of subscribers
    // Добавляем подписчика (клиентское соединение) в список подписчиков
    if (!subscriber) {
      this.subscribers[id] = ws;
    }
    // Update The Cache
    // Обновляем кэш
    this.updateCache({subscriber: ws});

    this.emit('add', {subscriber: ws, group: this});

  }

  /**
   * Get list of group subscribers
   * Получить список подписчиков группы
   *
   * @return {id[]} - will return an array of id of group subscribers (ws client connections)
   *                  вернет массив id подписчиков группы (клиентских соединений ws)
   */
  getSubscribers() {
    return Array.from(this.cache.subscribers);
  }

  /**
   * Remove subscriber from group
   * Удалить подписчика из группы
   *
   * @param {Object} [ws] - Subscriber client connection. If not set, then all subscribers will be deleted.
   *                        Клиентское соединение подписчика. Если не задано, то будут удалены все подписчики
   */
  deleteSubscriber(ws) {

    // Delete all subscribers
    // Удалить всех подписчиков
    if (!ws) {

      // For each subscriber, delete the group from the list to which it is subscribed
      // У каждого подписчика удалим группу из списка на которые он подписан
      const subscribers = Object.values(this.subscribers);
      for (const subscriber of subscribers) {
        this.emit('delete', {subscriber, group: this});
        subscriber.groups.delete(this.id);
      }

      // Clear the cache and delete all subscribers
      // Очистим кэш и удалим всех подписчиков
      this.clearCache();
      this.subscribers = {};

      return;
    }

    // remove the subscriber
    // Удалим подписчика
    const id = ws.id;
    delete this.subscribers[id];

    // The subscriber will remove the group from the list to which he is subscribed
    // У подписчика удалим группу из списка на которые он подписан
    ws.groups.delete(this.id);
    this.emit('delete', {subscriber: ws, group: this});

    // Update The Cache
    // Обновим кэш
    this.updateCache({subscriber: id, del: true});

  }

  /**
   * Send message to group subscribers
   * Послать сообщение подписчикам группы
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
   * @return {Promise<void>}
   */
  async sendMes({route, act, data, timeout = 10000, withoutId, sendParallel = 1000}) {

    // Get the client connections of subscribers
    // Получим клиентские соединения подписчиков
    const subscribers = Object.values(this.subscribers);

    // If withoutId is given, then we will exclude the client connection from the list
    // Если задан withoutId, то исключим клиентское соединение из рассылки
    const nextValueFn = ({value}) => {
      const ws = value;
      const next = ws.id === withoutId;
      if (next) return true;
    };

    // Send a message to the subscriber through a client connection
    // Пошлем сообщение подписчику через клиентское соединение
    const processingFn = async ({value}) => {
      const ws = value;
      await ws.sendMes({route, act, data, timeout});
    };

    // Send messages in parallel, send sendParallel to subscribers at a time
    // Выполняем рассылку сообщения параллельно, за раз отсылаем sendParallel подписчикам
    await parallelProcessing({arrayValues: subscribers, nextValueFn, processingFn, parallel: sendParallel});

  }

  /**
   * Refresh Group Cache
   * Обновить кэш группы
   *
   * @param {Object|string} [subscriber] - Subscriber, object or id, client connection
   *                                       Подписчик, объект или id, клиентского соединения
   *
   * @param {boolean} [del = false] - Remove subscriber from group
   *                                  Удалить подписчика из группы
   * @param {boolean} [refresh = false] - Refresh Cache
   *                                      Обновить кэш
   *
   * @return {{subscribers: Set<any>, group: string}} - Вернет кэш содержащий id группы и id подписчиков
   */
  updateCache({subscriber, del = false, refresh = false}) {

    // Update the cache, clean it first, then fill it with subscribers
    // Обновляем кэш, сначала чистим, далее заполняем подписчиками
    if (refresh) {

      this.clearCache();
      this.cache.group = this.id;
      this.cache.subscribers = new Set(Object.keys(this.subscribers));

      return this.cache;

    }

    // If the incorrect subscriber was passed, just return the cache
    // Если передали некорректного подписчика, просто возвращаем кэш
    if (!subscriber) return this.cache;

    const isString = typeof subscriber === 'string';
    const subscriberId = isString ? subscriber : pathExists(subscriber, 'id', '');

    if (!subscriberId) return this.cache;

    if (del) {
      // Delete the subscriber from the cache
      // Удаляем подписчика из кэша
      this.cache.subscribers.delete(subscriberId);
    } else {
      // Add the subscriber to the cache
      // Добавляем подписчика в кэша
      this.cache.subscribers.add(subscriberId);
    }

    return this.cache;

  }

  clearCache() {

    this.cache.subscribers.clear();

  }

}