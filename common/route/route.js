/**
 * The class responsible for routing incoming messages
 * Класс отвечающий за маршрутизацию входящих сообщений
 *
 * @type {Route}
 */
module.exports = class Route {

  /**
   * Create route object
   * Создать объект маршрута
   *
   * @param {string} [route] - Route, messages containing this route will be
   *                           processed by this handler
   *                           Маршрут, сообщения содержащие данный маршрут будут
   *                           обрабатываться данным обработчиком
   *
   * @param {string} [act] - Action on the route. Messages containing this action
   *                         and the route will be processed by this handler
   *                         Действие относительно маршрута. Сообщения содержащие данное действие
   *                         и маршрут будут обрабатываться данным обработчиком
   *
   * @param {function} handler - Асинхронная или синхронная функция обработки маршрута
   *
   */
  constructor({route, act, handler}) {

    if (typeof handler !== 'function') {
      throw new Error('The handler must be a function');
    }

    this.route = route;
    this.act = act;
    this.handler = handler;

  }

  /**
   * Check if the message route is being processed
   * Проверить попадает ли маршрут сообщения под обработку
   *
   * @param {string} [route] - Route, messages containing this route will be
   *                           processed by this handler
   *                           Маршрут, сообщения содержащие данный маршрут будут
   *                           обрабатываться данным обработчиком
   *
   * @param {string} [act] - Action on the route. Messages containing this action
   *                         and the route will be processed by this handler
   *                         Действие относительно маршрута. Сообщения содержащие данное действие
   *                         и маршрут будут обрабатываться данным обработчиком
   *
   * @return {Function} - If the message falls under the processing, then the function handler will return
   *                      Если сообщение попадает под обработку, то вернется функция обработчик
   */
  match({route, act}) {

    const isExec = this._match({route, act});
    if (isExec) return this.handler;

  }

  /**
   * Check if the message route is being processed
   * Проверить попадает ли маршрут сообщения под обработку
   *
   * @param {string} [route] - Route, messages containing this route will be
   *                           processed by this handler
   *                           Маршрут, сообщения содержащие данный маршрут будут
   *                           обрабатываться данным обработчиком
   *
   * @param {string} [act] - Action on the route. Messages containing this action
   *                         and the route will be processed by this handler
   *                         Действие относительно маршрута. Сообщения содержащие данное действие
   *                         и маршрут будут обрабатываться данным обработчиком
   *
   * @return {boolean|boolean} - If the message gets processed, it will return true
   *                             Если сообщение попадает под обработку, то вернет true
   * @private
   */
  _match({route, act}) {

    // If the route is not specified, then each message goes through this processing
    // Если маршрут не задан, то данную обработку проходит каждое сообщение
    if (!this.route) return true;

    const isMatchRoute = this.route === route;
    const isMatchAct = this.act === act;
    const isMatch = isMatchRoute && isMatchAct;

    // If only the route is specified, then processing takes place
    // all messages with this route, no matter
    // action is set or not
    // Если задан только маршрут, то обработку проходят
    // все сообщения с данным маршрутом, не зависимо от того
    // задано действие или нет
    const onlyRoute = this.route && !this.act;
    if (onlyRoute) {
      return isMatchRoute;
    }

    // If a route and action are given, then both are checked for compliance
    // Если задан маршрут и действие, то оба проверяются на соответствие
    return isMatch;

  }

};