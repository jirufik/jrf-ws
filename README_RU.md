# jrf-ws

![jrf-ws](jrfwslogo.png)

## Описание

**jrf-ws** - это JavaScript библиотека, для создания API реального времени
, на основе WebSockets. Является оберткой над легким и быстрым [ws](https://github.com/websockets/ws).

Состоит из серверной части, которая запускается в [node.js](https://nodejs.org/en/). 
И клиентской части, которая может запускаться в [node.js](https://nodejs.org/en/) 
и в web браузере.

Сообщения поддерживают маршрутизацию как на стороне сервера, так и на стороне
клиента. Отправить сообщение можно одним из 3 вариантов:

- Отправить сообщение асинхронно, не ожидая ответ
- Отправить сообщение асинхронно, ожидая ответ в callback
- Отправить сообщение асинхронно, ожидая ответ в синхронном стиле

Возможна групповая рассылка сообщений.

Поддерживается горизонтальное масштабирования серверной части.

Клиенту можно задать адреса нескольких серверов, при разрыве соединения, 
клиент будет пытаться подключиться к серверам по алгоритму Round-robin.

Для оптимизации работы, внутренние механизмы библиотеки, используют кэширование
и асинхронную параллельную итерационную обработку.

- [Клиент](https://github.com/jirufik/jrf-ws/blob/master/docs/ru/client.md)
- [Сервер](https://github.com/jirufik/jrf-ws/blob/master/docs/ru/server.md)
- [Горизонтальное масштабирование](https://github.com/jirufik/jrf-ws/blob/master/docs/ru/horizontalScaling.md)
- [Class Clones](https://github.com/jirufik/jrf-ws/blob/master/docs/ru/clones.md)
- [Class Groups](https://github.com/jirufik/jrf-ws/blob/master/docs/ru/groups.md)
- [Class Group](https://github.com/jirufik/jrf-ws/blob/master/docs/ru/group.md)

## Начать

### Сервер

```js
const jrfWS = require('jrf-ws');

// Создаем экземпляр сервера
const server = new jrfWS.Server({
  id: 'server',
  port: 4000
});

// Добавляем обработчик на событие запуска сервера
server.on('start', ({server}) => {
  console.log(`Сервер запущен на порту: ${server.port}`);
});

// Маршрутизация

// Добавляем обработку всех входящих сообщений
server.addRoute({
  handler: async ({ws, data, mes, stop}) => {

    // @param {Object}   ws    - Объект клиентского соединения (class WS)
    // @param {*}        data  - данные сообщения
    // @param {function} stop  - Синхронная функция, выполнение которой останавливает дальнейшую маршрутизацию

    console.log(`Обработка всех входящих сообщений на сервере. route: ${mes.route}, act: ${mes.act}, data: ${JSON.stringify(data)}`);

    // Отправим эхо сообщение, на маршрут 'echo', клиенту от которого пришло сообщение
    await ws.sendMes({route: 'echo', data});

  }
});

// Добавляем обработку сообщений с действием 'add' относительно маршрута 'math'
// @param {string} route - Маршрут
// @param {string} act   - Действие относительно маршрута
server.addRoute({

  route: 'math',
  act: 'add',

  handler: ({ws, route, act, data}) => {
    const a = data.a;
    const b = data.b;
    return a + b;
  }

});

server.start();
```  

### Клиент

```js
const jrfWS = require('jrf-ws');

// Создаем экземпляр клиента
const client = new jrfWS.Client({
id: 'client',
url: 'ws://localhost:4000'
});

// Добавим обработку маршрута 'echo'
client.addRoute({
route: 'echo',
handler: ({ws, data, stop}) => {

  // Выведем эхо ответ
  console.log(`echo data: ${JSON.stringify(data)}`);

  // Остановим дальнейшую маршрутизацию
  stop();

}
});

// Клиент отправляет сообщения серверу
const sendMessages = async () => {

// Отправим сообщение асинхронно, не ожидая ответ
await client.sendMes({data: {description: 'test message'}});
// server console.log -> `Обработка всех входящих сообщений на сервере. route: undefined, act: undefined, data: {description: 'test message'}`
// client console.log -> `echo data: {description: 'test message'}`


// Отправим сообщение асинхронно, ожидая ответ в синхронном стиле
const res = await client.sendMes({
  route: 'math',
  act: 'add',
  data: {a: 1, b: 2},
  awaitRes: true
});
// server console.log -> `Обработка всех входящих сообщений на сервере. route: 'math', act: 'add', data: {a: 1, b: 2}`
// client console.log -> `echo data: {a: 1, b: 2}`
console.log(res) // -> 3


// Отправим сообщение асинхронно, ожидая ответ в callback
const cbAfterRes = ({error, res}) => {
  console.log(res); // -> 8
};

await client.sendMes({
  route: 'math',
  act: 'add',
  data: {a: 5, b: 3},
  cbAfterRes
});
// server console.log -> `Обработка всех входящих сообщений на сервере. route: 'math', act: 'add', data: {a: 5, b: 3}`
// client console.log -> `echo data: {a: 5, b: 3}`

};

// Добавим обработчик на событие когда между сервером и клиентом откроется соединение
client.on('open', () => Promise.resolve().then(sendMessages));

// Запустим клиента
client.start();
```
