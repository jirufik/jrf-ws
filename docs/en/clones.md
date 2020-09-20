## class Clones

- [Clone Manager Properties](#Clone-Manager-Properties)
- [Methods](#Methods)
  - [Add a new remote clone](#Add-a-new-remote-clone)
  - [Remove the remote clone](#Remove-the-remote-clone)
  - [Get information about clones](#Get-information-about-clone)
  - [Run a remote clone survey](#Run-a-remote-clone-survey)
  - [Stop polling remote clones](#Stop-polling-remote-clones)
  - [Get the list of clones available to them from remote clones](#Get-the-list-of-clones-available-to-them-from-remote-clones)

Clone class is responsible for communication of clones with each other (clone manager). 
It is located in the server property `clones`.

### Clone Manager Properties

| name | type | description |
| --- | --- | --- |
| server | Object | Server `class Server` |
| interval | number | Periodicity with which to survey remote clones (milliseconds) |
| clones | Map | Client connections to remote clones `class Client` |  
| cache | Object | Cache groups, object with properties `id`, `url`, `active`. `id` - An object the keys of which are `id` of remote clones, the value of the key is clone information. `url` - The object the keys of which are `url` clones, the value of the key is information about the clone `client.getInfo()`. `active` - The object, the keys of which are `id` active clones (accessible via the network), the value of the key is information about the clone `client.getInfo()`. |

### Methods

#### Add a new remote clone

`add`, parameters:

| name | type | description |
| --- | --- | --- |
| id | string | `id` remote clone |
| url | string | `url` connections to a remote clone |
| authFnOut | function | The function returns a value for authentication on a remote clone. For example, a token that authenticates a remote clone, when connected to it |

#### Remove the remote clone

`delete`, parameters:

| name | type | description |
| --- | --- | --- |
| id | string | `id` remote clone |

#### Get information about clones

`get`, parameters:

| name | type | description |
| --- | --- | --- |
| id | string | `id` remote clone |
| url | string | `url` remote clone |
| active | boolean | `true` - Get information about active clones (available via network) |

Returns clone(s) information depending on the input parameters

#### Run a remote clone survey

`start`

#### Stop polling remote clones

`stop`

#### Get the list of clones available to them from remote clones

Get the list of clones available to them from remote clones. Add to the 
clones manager clones that were previously unknown to them. 
`async getRemoteClones`, options:

| name | type | description |
| --- | --- | --- |
| id | string | `id` servers (this clone for remote ones) |
| url | string | `url` servers (this clone for remote ones) |
| active | boolean | `true` - Get the list of active clones only. |