## class Groups

- [Group Manager Properties](#Group-Manager-Properties)
- [Methods](#Methods)
  - [Add a group](#Add-a-group)
  - [Delete group](#Delete-group)
  - [Get groups](#Get-groups)
  - [Add a Subscriber](#Add-a-Subscriber)
  - [Delete subscriber](#Delete-subscriber)
  - [Send a group message](#Send-a-group-message)

Group class (group manager). It is located in the server property `groups`.

### Group Manager Properties

| name | type | description |
| --- | --- | --- |
| server | Object | Server `class Server` |
| groups | Object | List of groups. The key is `id` groups. Value - object of the `class Group`. |  
| cache | Object | Cache groups, object with property `groups`. The key is `id` of the group. Value - array of `id` subscribers (client connections `calss WS`). |

### Methods

#### Add a group

Add a new group to the group manager `add`, parameters:

| name | type | description |
| --- | --- | --- |
| id | string | Groupd `id` |
| ws | Object | Subscriber's client connections `class WS`. If specified, the subscriber will be subscribed to the added group |
| data | Object | Object with any user information about the group |

#### Delete group

Delete group, send the command to clones to delete the group `delete`, parameters:

| name | type | description |
| --- | --- | --- |
| id | string | Group `id` |
| excludeClones | Array | Array of `id` clones, which have already been sent a message about deletion by other clones |

#### Get groups

Get group(s) `get`, parameters:

| name | type | description |
| --- | --- | --- |
| id | string | Group `id` |

It will return the groups cache. If set to `id`, then the group cache of `class Group`.

#### Add a Subscriber

Add a subscriber to the group `addSubscriber`, parameters:

| name | type | description |
| --- | --- | --- |
| id | string | Group `id` |
| ws | Object | Subscriber's client connections `class WS`. |

#### Delete subscriber

Remove subscriber(s) `deleteSubscriber`, parameters:

| name | type | description |
| --- | --- | --- |
| id | string | `id` groups, if the group is not specified, the subscriber is removed from all groups |
| ws | Object | Subscriber's client connections `class WS`. |

#### Send a group message

Send a message to subscribers of groups(s). Clones also receive a message. `async sendMes`, parameters:

| name | type | description |
| --- | --- | --- |
| id | null/string/Array | `id` groups. If not specified, the message is sent to all groups. If `id` is specified, the message is sent to the group. If the `id` array is specified, the message is sent to the specified groups. |
| route | string | Route |
| act | string | Action on the path |
| data | * | Data to be sent |
| withoutId | string | Client whose `id` is excluded from the mailing list |
| sendParallel | number | The number of subscribers to whom to send the message in parallel [jrf-pip](https://github.com/jirufik/jrf-pip) |
| excludeClones | Array | array of `id` clones, which have already been sent a message by other clones |