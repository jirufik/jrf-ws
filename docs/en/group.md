## class Group

- [Properties](#Properties)
- [Methods](#Methods)
  - [Add a Subscriber](#Add-a-Subscriber)
  - [Get the list of subscribers to the group](#Get-the-list-of-subscribers-to-the-group)
  - [Remove a subscriber from the group](#Remove-a-subscriber-from-the-group)
  - [Send a message to group subscribers](#Send-a-message-to-group-subscribers)

Class Group.

### Properties

| name | type | description |
| --- | --- | --- |
| id | string | Group `id` |
| data | Object | Object with any user information about the group |
| subscribers | Object | Subscribers of the group in this clone. key - `id` client connection of subscriber `class WS`, value - client connection of subscriber `class WS`. |
| cache | Object | With properties `group`, `subscribers`. Cache contains `id` groups and `id` subscribers of the group. |  

### Methods

#### Add a Subscriber

`addSubscriber` parameters:

| name | type | description |
| --- | --- | --- |
| ws | Object | Subscriber's client connections `class WS`. |

#### Get the list of subscribers to the group

`getSubscriber` parameters:

| name | type | description |
| --- | --- | --- |
| ws | Object | Subscriber's client connections `class WS`. |

Returns an array of `id` subscribers of the group (client connections `class WS`).

#### Remove a subscriber from the group

`deleteSubscriber` parameters:

| name | type | description |
| --- | --- | --- |
| ws | Object | Subscriber's client connections `class WS`. If not specified, all subscribers will be deleted. |

#### Send a message to group subscribers

Send a message to subscribers of the group `async sendMes`, parameters:

| name | type | description |
| --- | --- | --- |
| route | string | Route |
| act | string | Action on the path |
| data | * | Data to be sent |
| withoutId | string | Client whose `id` is excluded from the mailing list |
| sendParallel | number | The number of subscribers to whom to send the message in parallel [jrf-pip](https://github.com/jirufik/jrf-pip) |