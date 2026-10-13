[Back to top](https://developers.exaroton.com/#top)

[Overview](https://developers.exaroton.com/#top)

* [Packages and libraries](https://developers.exaroton.com/#header-packages-and-libraries)
* [Official libraries](https://developers.exaroton.com/#header-official-libraries)
* [Community libraries](https://developers.exaroton.com/#header-community-libraries)
* [Authentication](https://developers.exaroton.com/#header-authentication)
* [Websocket API](https://developers.exaroton.com/#header-websocket-api)
* [Basic messages](https://developers.exaroton.com/#header-basic-messages)
* [Streams](https://developers.exaroton.com/#header-streams)
* [status](https://developers.exaroton.com/#header-status)
* [console](https://developers.exaroton.com/#header-console)
* [tick](https://developers.exaroton.com/#header-tick)
* [stats](https://developers.exaroton.com/#header-stats)
* [heap](https://developers.exaroton.com/#header-heap)
* [management](https://developers.exaroton.com/#header-management)
* [Server status](https://developers.exaroton.com/#header-server-status)

[Resource Group](https://developers.exaroton.com/)

* [Get account info](https://developers.exaroton.com/#account-get)
* [Servers](https://developers.exaroton.com/#servers)
  + [List servers](https://developers.exaroton.com/#servers-get)
  + [Get a server](https://developers.exaroton.com/#servers-get-1)
* [Logs](https://developers.exaroton.com/#logs)
  + [Get a server log](https://developers.exaroton.com/#logs-get)
  + [Upload a server log to mclo.gs](https://developers.exaroton.com/#logs-get-1)
* [RAM](https://developers.exaroton.com/#ram)
  + [Get server RAM](https://developers.exaroton.com/#ram-get)
  + [Change server RAM](https://developers.exaroton.com/#ram-post)
* [MOTD](https://developers.exaroton.com/#motd)
  + [Get server MOTD](https://developers.exaroton.com/#motd-get)
  + [Change server MOTD](https://developers.exaroton.com/#motd-post)
* [Server actions](https://developers.exaroton.com/#server-actions)
  + [Start a server](https://developers.exaroton.com/#server-actions-get)
  + [Start a server with own credits](https://developers.exaroton.com/#server-actions-post)
  + [Stop a server](https://developers.exaroton.com/#server-actions-get-1)
  + [Restart a server](https://developers.exaroton.com/#server-actions-get-2)
  + [Execute a server command](https://developers.exaroton.com/#server-actions-post-1)
  + [Extend server stop timer](https://developers.exaroton.com/#server-actions-post-2)
* [Get available player lists](https://developers.exaroton.com/#get-available-player-lists-get)
* [Player lists](https://developers.exaroton.com/#player-lists)
  + [Get player list contents](https://developers.exaroton.com/#player-lists-get)
  + [Add entries to player list](https://developers.exaroton.com/#player-lists-put)
  + [Remove entries from player list](https://developers.exaroton.com/#player-lists-delete)
* [Get file information](https://developers.exaroton.com/#file-info-get)
* [File data](https://developers.exaroton.com/#file-data)
  + [Get file data](https://developers.exaroton.com/#file-data-get)
  + [Write file data](https://developers.exaroton.com/#file-data-put)
  + [Delete a file](https://developers.exaroton.com/#file-data-delete)
* [Config files](https://developers.exaroton.com/#config-files)
  + [Get config options](https://developers.exaroton.com/#config-files-get)
  + [Update config options](https://developers.exaroton.com/#config-files-post)
* [Credit Pools](https://developers.exaroton.com/#credit-pools)
  + [List credit pools](https://developers.exaroton.com/#credit-pools-get)
  + [Get a credit pool](https://developers.exaroton.com/#credit-pools-get-1)
  + [List pool members](https://developers.exaroton.com/#credit-pools-get-2)
  + [List pool servers](https://developers.exaroton.com/#credit-pools-get-3)

<https://api.exaroton.com/v1>

# exaroton API

exaroton offers a public API that allows you to integrate your server into your programs and apps.
Currently, only some basic features can be used via the API.

## Packages and libraries [¶](https://developers.exaroton.com/#header-packages-and-libraries)

### Official libraries [¶](https://developers.exaroton.com/#header-official-libraries)

To easily access our API, you can use on of these libraries maintained by exaroton:

* Node.js: <https://www.npmjs.com/package/exaroton>
* Java: <https://github.com/exaroton/java-exaroton-api>

### Community libraries [¶](https://developers.exaroton.com/#header-community-libraries)

There are also several community-maintained libraries for different languages. These libraries are not maintained by exaroton
and may not be feature complete, but can still be useful to get started:

* Python: <https://github.com/ColinShark/exaroton>
* Swift: <https://github.com/wangzhizhou/ExarotonAPI>
* Go: <https://github.com/Icikowski/exaroton>
* C#: <https://github.com/robotman40/Exaroton>

You can also use our [OpenAPI spec](https://developers.exaroton.com/openapi.yaml) to generate clients for a large variety of programming languages.

## Authentication [¶](https://developers.exaroton.com/#header-authentication)

To authenticate your requests, you need a valid API token.
This token can be generated in your [exaroton account settings](https://exaroton.com/account/) and needs to be sent in the `Authorization` HTTP header with every request you make.

```
Authorization: Bearer {token}
```

# Websocket API [¶](https://developers.exaroton.com/#header-websocket-api)

The websocket API allows a constant connection to our websocket service to receive events in real time without polling
(e.g. trying to get the server status every few seconds).

You can use our [Node.js library](https://www.npmjs.com/package/exaroton) as a reference implementation.

```
https://api.exaroton.com/v1/servers/{server}/websocket
```

## Basic messages [¶](https://developers.exaroton.com/#header-basic-messages)

All messages received from or sent to the websocket are JSON strings.
Every JSON object has a `type` property, and may additionally have a `data` and a `stream` property.

**ready**

```
{"type":"ready","data":"6L5WWSK73YnWGHQE"}
```

Sent after opening a websocket connection. `data` is the ID of the server you connected to.
Before this message is received, no messages should be sent to the websocket.

**connected**

```
{"type":"connected"}
```

Sent when a connection to a running game server is established.

**disconnected**

```
{"type":"disconnected","data":"invalid-status"}
```

Sent when a connection to a game server failed or was lost. `data` includes the reason for the disconnect.

**keep-alive**

```
{"type":"keep-alive"}
```

Sent when if no other messages were sent for a longer period of time. This message can be ignored.

## Streams [¶](https://developers.exaroton.com/#header-streams)

Messages that include a `stream` property are a part of a specific data stream. There are 5 different data streams available in our WebSocket API:

## status [¶](https://developers.exaroton.com/#header-status)

By default, you are always subscribed to server status changes. The only message type in this stream is `status`

**status**

```
{
  "stream": "status",
  "type": "status",
  "data": {
    "id": "EwYiY9IAMtQBTb6U",
    "name": "example",
    "address": "example.exaroton.me",
    "motd": "Welcome to the server of example!",
    "status": 2,
    "players": {
      "max": 20,
      "count": 0,
      "list": []
    },
    "host": "gibberfish.exaroton.host",
    "port": 48249,
    "software": {
      "id": "kb4p09ABvLjxzedx",
      "name": "Vanilla",
      "version": "1.16.5"
    },
    "shared": false
  }
}
```

The `data` field of this message is a regular API server object.

## console [¶](https://developers.exaroton.com/#header-console)

The `console` stream can be used to receive a live feed of the server’s console output.
Note that this is the server’s raw console output, so it might contain both ANSI escape codes and control characters.

You can subscribe to the `console` stream by sending a `start` message while the server is running:

```
{"stream":"console","type":"start","data":{"tail":0}}
```

The `tail` option can be used to receive up to 500 lines from the previous console output.

You can unsubscribe by sending a `stop` message:

```
{"stream":"console","type":"stop"}
```

Additional to receiving console output, this stream can also be used as a faster way of sending commands to the server:

```
{"stream":"console","type":"command","data":"say Hello World!"}
```

**started**

A `started` messages is sent when the stream was started successfully.

```
{"stream":"console","type":"started"}
```

**line**

Console `line` messages include a line of console output.

```
{"stream":"console","type":"line","data":"[14:20:56] [Server thread/INFO]: [Server] test"}
```

## tick [¶](https://developers.exaroton.com/#header-tick)

The `tick` stream provides information about the servers current in-game tick speed.
Note that this stream is only available for Minecraft Java Edition 1.16+.

You can subscribe to the `tick` stream by sending a `start` message while the server is online:

```
{"stream":"tick","type":"start"}
```

You can unsubscribe by sending a `stop` message:

```
{"stream":"tick","type":"stop"}
```

**started**

A `started` messages is sent when the stream was started successfully.

```
{"stream":"console","type":"started"}
```

**tick**

`tick` messages include the current average tick time (in ms).

```
{"stream":"tick","type":"tick","data":{"averageTickTime":8.7218612}}
```

## stats [¶](https://developers.exaroton.com/#header-stats)

The `stats` stream provides information about server stats (currently only memory usage).

You can subscribe to the `stats` stream by sending a `start` message while the server is online:

```
{"stream":"stats","type":"start"}
```

You can unsubscribe by sending a `stop` message:

```
{"stream":"stats","type":"stop"}
```

**started**

A `started` messages is sent when the stream was started successfully.

```
{"stream":"stats","type":"started"}
```

**stats**

`stats` messages include the current memory usage.

```
{"stream":"stats","type":"stats","data":{"memory":{"percent":38.49,"usage":1983938560}}}
```

## heap [¶](https://developers.exaroton.com/#header-heap)

The `heap` stream is a much more accurate way of determining a server’s RAM usage.
It is, however, only availabe for Java-based server software.

You can subscribe to the `heap` stream by sending a `start` message while the server is online:

```
{"stream":"heap","type":"start"}
```

You can unsubscribe by sending a `stop` message:

```
{"stream":"heap","type":"stop"}
```

**started**

A `started` messages is sent when the stream was started successfully.

```
{"stream":"heap","type":"started"}
```

**heap**

`heap` messages include the current memory usage.

```
{"stream":"heap","type":"heap","data":{"usage":1225721600}}
```

## management [¶](https://developers.exaroton.com/#header-management)

The `management` stream can be used to interact with the server using the [Minecraft server management protocol](https://minecraft.wiki/w/Minecraft_Server_Management_Protocol)
introduced in 1.21.9. This protocol allows controlling various server settings without restarting the server and
notifies clients of events happening on the server.
Configuring the management server in the server.properties is not necessary, as this is automatically handled by exaroton.

You can subscribe to the `management` stream by sending a `start` message while the server is running:

```
{"stream":"management","type":"start"}
```

You can unsubscribe by sending a `stop` message:

```
{"stream":"management","type":"stop"}
```

Management requests can be sent by sending a `request` message. A request consists of the method you would like to call,
its optional parameters and a unique `id` to identify the response.

```
{"stream":"management","type":"request","data":{"id":"unique-id","method":"minecraft:server/status", "params":{}}}
```

**started**

A `started` messages is sent when the stream was started successfully.

```
{"stream":"management","type":"started"}
```

**response**

Responses to `request` messages have the same id provided by the client and the response data from the server.

```
{"stream":"management","type":"response","data":{"id":"unique-id","data":{"started":true,"version":{"name":"1.21.9 Release Candidate 1","protocol":1073742097}}}}
```

**notification**

Notifications are sent by the server when certain events happen. The notification type is included in the `name` property.

```
{"stream":"management","type":"notification","data":{"name":"minecraft:notification/allowlist/added","data":[{"id":"22c777bb-e823-4ab8-b17b-acd3eef0b597","name":"exaroton"}]}}
```

# Server status [¶](https://developers.exaroton.com/#header-server-status)

Servers can have different numeric status codes. Depending on a server’s status, only certain features might be available.

```
0  = OFFLINE
1  = ONLINE
2  = STARTING
3  = STOPPING
4  = RESTARTING
5  = SAVING
6  = LOADING
7  = CRASHED
8  = PENDING
9  = TRANSFERRING
10 = PREPARING
```

## Resource Group [¶](https://developers.exaroton.com/)

### Account [¶](https://developers.exaroton.com/#account)

#### Get account info [GET](https://developers.exaroton.com/#account-get)`/account/`

#### Example URI

GET https://api.exaroton.com/v1/account/

**Request**

HideShow

##### Headers

```
Authorization: Bearer {apitoken}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": {
    "name": "example",
    "email": "example@exaroton.com",
    "verified": true,
    "credits": 42
  }
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "object",
        "null"
      ],
      "properties": {
        "name": {
          "type": "string"
        },
        "email": {
          "type": "string"
        },
        "verified": {
          "type": "boolean"
        },
        "credits": {
          "type": "number"
        }
      }
    }
  }
}
```

### Servers [¶](https://developers.exaroton.com/#servers)

#### List servers [GET](https://developers.exaroton.com/#servers-get)`/servers/`

#### Example URI

GET https://api.exaroton.com/v1/servers/

**Request**

HideShow

##### Headers

```
Authorization: Bearer {api-token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": null,
  "data": [
    {
      "id": "EwYiY9IAMtQBTb6U",
      "name": "example",
      "address": "example.exaroton.me",
      "motd": "Welcome to the server of example!",
      "status": 0,
      "host": null,
      "port": null,
      "players": {
        "max": 20,
        "count": 0,
        "list": []
      },
      "software": {
        "id": "kb4p09ABvLjxzedx",
        "name": "Vanilla",
        "version": "1.16.5"
      },
      "shared": false
    }
  ]
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "array",
        "null"
      ]
    }
  }
}
```

#### Get a server [GET](https://developers.exaroton.com/#servers-get-1)`/servers/{server}`

#### Example URI

GET https://api.exaroton.com/v1/servers/server

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": null,
  "data": {
    "id": "EwYiY9IAMtQBTb6U",
    "name": "example",
    "address": "example.exaroton.me",
    "motd": "Welcome to the server of example!",
    "status": 0,
    "host": null,
    "port": null,
    "players": {
      "max": 20,
      "count": 0,
      "list": []
    },
    "software": {
      "id": "kb4p09ABvLjxzedx",
      "name": "Vanilla",
      "version": "1.16.5"
    },
    "shared": false
  }
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "object",
        "null"
      ],
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique server ID"
        },
        "name": {
          "type": "string",
          "description": "Server name"
        },
        "address": {
          "type": "string",
          "description": "Full server address (e.g. example.exaroton.me)"
        },
        "motd": {
          "type": "string"
        },
        "status": {
          "type": "number",
          "description": "0 = OFFLINE; 1 = ONLINE; 2 = STARTING; 3 = STOPPING; 4 = RESTARTING; 5 = SAVING; 6 = LOADING; 7 = CRASHED; 8 = PENDING; 10 = PREPARING;"
        },
        "host": {
          "type": [
            "string",
            "null"
          ],
          "description": "Host machine the server is running on, only available if the server is online"
        },
        "port": {
          "type": [
            "number",
            "null"
          ],
          "description": "Port the server is listening on, only available if the server is online"
        },
        "players": {
          "type": "object",
          "properties": {
            "max": {
              "type": "number",
              "description": "Maximum player count (slots)"
            },
            "count": {
              "type": "number",
              "description": "Current player count"
            },
            "list": {
              "type": "array",
              "description": "Current player list (not always available)"
            }
          }
        },
        "software": {
          "type": [
            "object",
            "null"
          ],
          "properties": {
            "id": {
              "type": "string",
              "description": "Unique software ID"
            },
            "name": {
              "type": "string",
              "description": "Software name"
            },
            "version": {
              "type": "string",
              "description": "Software version"
            }
          },
          "description": "Information about the installed server software"
        },
        "shared": {
          "type": "boolean",
          "description": "Whether the server is accessed via the Share Access feature"
        }
      }
    }
  }
}
```

### Logs [¶](https://developers.exaroton.com/#logs)

#### Get a server log [GET](https://developers.exaroton.com/#logs-get)`/servers/{server}/logs/`

#### Example URI

GET https://api.exaroton.com/v1/servers/server/logs/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": {
    "content": "[16:14:36] [main/INFO]: Environment: authHost='https://authserver.mojang.com',..."
  }
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "object",
        "null"
      ],
      "properties": {
        "content": {
          "type": [
            "string",
            "null"
          ]
        }
      }
    }
  }
}
```

#### Upload a server log to mclo.gs [GET](https://developers.exaroton.com/#logs-get-1)`/servers/{server}/logs/share/`

#### Example URI

GET https://api.exaroton.com/v1/servers/server/logs/share/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": {
    "id": "zCcf8T5",
    "url": "https://mclo.gs/zCcf8T5",
    "raw": "https://api.mclo.gs/1/raw/zCcf8T5"
  }
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "object",
        "null"
      ],
      "properties": {
        "id": {
          "type": "string"
        },
        "url": {
          "type": "string"
        },
        "raw": {
          "type": "string"
        }
      }
    }
  }
}
```

### RAM [¶](https://developers.exaroton.com/#ram)

#### Get server RAM [GET](https://developers.exaroton.com/#ram-get)`/servers/{server}/options/ram/`

#### Example URI

GET https://api.exaroton.com/v1/servers/server/options/ram/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": {
    "ram": 7
  }
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "object",
        "null"
      ],
      "properties": {
        "ram": {
          "type": "number"
        }
      }
    }
  }
}
```

#### Change server RAM [POST](https://developers.exaroton.com/#ram-post)`/servers/{server}/options/ram/`

#### Example URI

POST https://api.exaroton.com/v1/servers/server/options/ram/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

**Request**

HideShow

##### Headers

```
Content-Type: application/json
Authorization: Bearer {token}
```

##### Body

```
{
  "ram": 8
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "ram": {
      "type": "number"
    }
  }
}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": {
    "ram": 7
  }
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "object",
        "null"
      ],
      "properties": {
        "ram": {
          "type": "number"
        }
      }
    }
  }
}
```

### MOTD [¶](https://developers.exaroton.com/#motd)

#### Get server MOTD [GET](https://developers.exaroton.com/#motd-get)`/servers/{server}/options/motd/`

#### Example URI

GET https://api.exaroton.com/v1/servers/server/options/motd/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": {
    "motd": "\"Welcome to my server!\""
  }
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "object",
        "null"
      ],
      "properties": {
        "motd": {
          "type": "string"
        }
      }
    }
  }
}
```

#### Change server MOTD [POST](https://developers.exaroton.com/#motd-post)`/servers/{server}/options/motd/`

#### Example URI

POST https://api.exaroton.com/v1/servers/server/options/motd/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

**Request**

HideShow

##### Headers

```
Content-Type: application/json
Authorization: Bearer {token}
```

##### Body

```
{
  "motd": "\"Welcome to my server!\""
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "motd": {
      "type": "string"
    }
  }
}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": {
    "motd": "\"Welcome to my server!\""
  }
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "object",
        "null"
      ],
      "properties": {
        "motd": {
          "type": "string"
        }
      }
    }
  }
}
```

### Server actions [¶](https://developers.exaroton.com/#server-actions)

#### Start a server [GET](https://developers.exaroton.com/#server-actions-get)`/servers/{server}/start/`

#### Example URI

GET https://api.exaroton.com/v1/servers/server/start/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": "Hello, world!"
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "string",
        "null"
      ]
    }
  }
}
```

#### Start a server with own credits [POST](https://developers.exaroton.com/#server-actions-post)`/servers/{server}/start/`

When starting a server that you have shared access to, you can use your own credits to pay for the server by setting
the `useOwnCredits` attribute to `true`.

#### Example URI

POST https://api.exaroton.com/v1/servers/server/start/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

##### Body

```
{
  "useOwnCredits": true
}
```

##### Schema

```
{
  "type": "object",
  "properties": {
    "useOwnCredits": {
      "type": "boolean"
    }
  },
  "$schema": "http://json-schema.org/draft-04/schema#"
}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": "Hello, world!"
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "string",
        "null"
      ]
    }
  }
}
```

#### Stop a server [GET](https://developers.exaroton.com/#server-actions-get-1)`/servers/{server}/stop/`

#### Example URI

GET https://api.exaroton.com/v1/servers/server/stop/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": "Hello, world!"
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "string",
        "null"
      ]
    }
  }
}
```

#### Restart a server [GET](https://developers.exaroton.com/#server-actions-get-2)`/servers/{server}/restart/`

#### Example URI

GET https://api.exaroton.com/v1/servers/server/restart/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": "Hello, world!"
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "string",
        "null"
      ]
    }
  }
}
```

#### Execute a server command [POST](https://developers.exaroton.com/#server-actions-post-1)`/servers/{server}/command/`

#### Example URI

POST https://api.exaroton.com/v1/servers/server/command/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

**Request**

HideShow

##### Headers

```
Content-Type: application/json
Authorization: Bearer {token}
```

##### Body

```
{
  "command": "say Hello World"
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "command": {
      "type": "string"
    }
  }
}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": "Hello, world!"
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "string",
        "null"
      ]
    }
  }
}
```

#### Extend server stop timer [POST](https://developers.exaroton.com/#server-actions-post-2)`/servers/{server}/extend-time/`

#### Example URI

POST https://api.exaroton.com/v1/servers/server/extend-time/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

##### Body

```
{
  "time": 60
}
```

##### Schema

```
{
  "type": "object",
  "properties": {
    "time": {
      "type": "number",
      "description": "Additional time in seconds to add to the stop timer"
    }
  },
  "$schema": "http://json-schema.org/draft-04/schema#"
}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": "Hello, world!"
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "string",
        "null"
      ]
    }
  }
}
```

### Get available player lists [¶](https://developers.exaroton.com/#get-available-player-lists)

#### Get available player lists [GET](https://developers.exaroton.com/#get-available-player-lists-get)`/servers/{server}/playerlists/`

#### Example URI

GET https://api.exaroton.com/v1/servers/server/playerlists/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": [
    "whitelist",
    "ops",
    "banned"
  ]
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": "array",
      "description": "players, banned-ips (array[string], nullable)"
    }
  }
}
```

### Player lists [¶](https://developers.exaroton.com/#player-lists)

A player list is a list of players such as the whitelist, ops or bans. Player list entries are usually usernames,
but might be something else, e.g. IPs in the banned-ips list. All player list operations are storage operations
that might take a while, so try to reduce the amount of requests and combine actions when possible
(e.g. adding/deleting multiple entries at once).
Player lists are also cached and might not immediately return new results when changed through other methods.

#### Get player list contents [GET](https://developers.exaroton.com/#player-lists-get)`/servers/{server}/playerlists/{list}/`

#### Example URI

GET https://api.exaroton.com/v1/servers/server/playerlists/list/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

list
:   `string` (required)

    Player list name

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": [
    "exaroton",
    "example"
  ]
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "array",
        "null"
      ]
    }
  }
}
```

#### Add entries to player list [PUT](https://developers.exaroton.com/#player-lists-put)`/servers/{server}/playerlists/{list}/`

#### Example URI

PUT https://api.exaroton.com/v1/servers/server/playerlists/list/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

list
:   `string` (required)

    Player list name

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

##### Body

```
{
  "entries": [
    "player"
  ]
}
```

##### Schema

```
{
  "type": "object",
  "properties": {
    "entries": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "$schema": "http://json-schema.org/draft-04/schema#"
}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": [
    "exaroton",
    "example",
    "player"
  ]
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "array",
        "null"
      ]
    }
  }
}
```

#### Remove entries from player list [DELETE](https://developers.exaroton.com/#player-lists-delete)`/servers/{server}/playerlists/{list}/`

#### Example URI

DELETE https://api.exaroton.com/v1/servers/server/playerlists/list/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

list
:   `string` (required)

    Player list name

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

##### Body

```
{
  "entries": [
    "player"
  ]
}
```

##### Schema

```
{
  "type": "object",
  "properties": {
    "entries": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "$schema": "http://json-schema.org/draft-04/schema#"
}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": [
    "exaroton",
    "example"
  ]
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "array",
        "null"
      ]
    }
  }
}
```

### File info [¶](https://developers.exaroton.com/#file-info)

#### Get file information [GET](https://developers.exaroton.com/#file-info-get)`/servers/{server}/files/info/{path}/`

#### Example URI

GET https://api.exaroton.com/v1/servers/server/files/info/path/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

path
:   `string` (required)

    File path

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": null,
  "data": {
    "path": "world/playerdata",
    "name": "playerdata",
    "isTextFile": false,
    "isConfigFile": false,
    "isDirectory": true,
    "isLog": false,
    "isReadable": false,
    "isWritable": false,
    "size": 4096,
    "children": [
      {}
    ]
  }
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "object",
        "null"
      ],
      "properties": {
        "path": {
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "isTextFile": {
          "type": "boolean"
        },
        "isConfigFile": {
          "type": "boolean"
        },
        "isDirectory": {
          "type": "boolean"
        },
        "isLog": {
          "type": "boolean"
        },
        "isReadable": {
          "type": "boolean"
        },
        "isWritable": {
          "type": "boolean"
        },
        "size": {
          "type": "number"
        },
        "children": {
          "type": [
            "array",
            "null"
          ]
        }
      }
    }
  }
}
```

### File data [¶](https://developers.exaroton.com/#file-data)

#### Get file data [GET](https://developers.exaroton.com/#file-data-get)`/servers/{server}/files/data/{path}/`

#### Example URI

GET https://api.exaroton.com/v1/servers/server/files/data/path/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

path
:   `string` (required)

    File path

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/octet-stream
```

#### Write file data [PUT](https://developers.exaroton.com/#file-data-put)`/servers/{server}/files/data/{path}/`

Files are written with a simple `PUT` request. If the destination file already exists, it will be overwritten,
otherwise a new file will be created.
Directories can be created by sending a write request with the `inode/directory` content type.

#### Example URI

PUT https://api.exaroton.com/v1/servers/server/files/data/path/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

path
:   `string` (required)

    File path

**Request**

HideShow

##### Headers

```
Content-Type: application/octet-stream
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": "Hello, world!"
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "string",
        "null"
      ]
    }
  }
}
```

#### Delete a file [DELETE](https://developers.exaroton.com/#file-data-delete)`/servers/{server}/files/data/{path}/`

#### Example URI

DELETE https://api.exaroton.com/v1/servers/server/files/data/path/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

path
:   `string` (required)

    File path

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": "Hello, world!",
  "data": "Hello, world!"
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "string",
        "null"
      ]
    }
  }
}
```

### Config files [¶](https://developers.exaroton.com/#config-files)

#### Get config options [GET](https://developers.exaroton.com/#config-files-get)`/servers/{server}/files/config/{path}/`

Each config option has a `key`, a `label`, a `type` and a `value`. Possible types are `string`, `integer`, `float`, `boolean`, `multiselect`, `select`.
Additionally, multiselect and select options have an `options` array.
Select options can only have a value from the options array, while multiselect options can also have custom values.

#### Example URI

GET https://api.exaroton.com/v1/servers/server/files/config/path/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

path
:   `string` (required)

    File path

**Request**

HideShow

##### Headers

```
Authorization: Bearer {token}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": null,
  "data": [
    {
      "key": "gamemode",
      "value": "survival",
      "label": "Gamemode",
      "type": "select",
      "options": [
        "survival",
        "creative",
        "adventure",
        "spectator"
      ]
    }
  ]
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "array",
        "null"
      ]
    }
  }
}
```

#### Update config options [POST](https://developers.exaroton.com/#config-files-post)`/servers/{server}/files/config/{path}/`

Config options to update can be sent as a JSON object in the request body.

#### Example URI

POST https://api.exaroton.com/v1/servers/server/files/config/path/

**URI Parameters**

HideShow

server
:   `ServerID` (required)

    Unique server ID

path
:   `string` (required)

    File path

**Request**

HideShow

##### Headers

```
Content-Type: application/json
Authorization: Bearer {token}
```

##### Body

```
{
  "key1": "value1",
  "key2": "value2"
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "key1": {
      "type": "string"
    },
    "key2": {
      "type": "string"
    }
  }
}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": null,
  "data": [
    {
      "key": "gamemode",
      "value": "survival",
      "label": "Gamemode",
      "type": "select",
      "options": [
        "survival",
        "creative",
        "adventure",
        "spectator"
      ]
    }
  ]
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "array",
        "null"
      ]
    }
  }
}
```

### Credit Pools [¶](https://developers.exaroton.com/#credit-pools)

#### List credit pools [GET](https://developers.exaroton.com/#credit-pools-get)`/billing/pools/`

#### Example URI

GET https://api.exaroton.com/v1/billing/pools/

**Request**

HideShow

##### Headers

```
Authorization: Bearer {apitoken}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": null,
  "data": [
    {
      "id": "X4iJREgqBGFSBtn0",
      "name": "example",
      "credits": 42,
      "servers": 1,
      "owner": "X4iJREgqBGFSBtn0",
      "isOwner": true,
      "members": 1,
      "ownShare": 1,
      "ownCredits": 42
    }
  ]
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "array",
        "null"
      ]
    }
  }
}
```

#### Get a credit pool [GET](https://developers.exaroton.com/#credit-pools-get-1)`/billing/pools/{pool}`

#### Example URI

GET https://api.exaroton.com/v1/billing/pools/pool

**URI Parameters**

HideShow

pool
:   `PoolID` (required)

    Unique pool ID

**Request**

HideShow

##### Headers

```
Authorization: Bearer {apitoken}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": null,
  "data": {
    "id": "X4iJREgqBGFSBtn0",
    "name": "example",
    "credits": 42,
    "servers": 1,
    "owner": "X4iJREgqBGFSBtn0",
    "isOwner": true,
    "members": 1,
    "ownShare": 1,
    "ownCredits": 42
  }
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "object",
        "null"
      ],
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique pool ID"
        },
        "name": {
          "type": "string",
          "description": "Pool name"
        },
        "credits": {
          "type": "number",
          "description": "Pool credits"
        },
        "servers": {
          "type": "number",
          "description": "Number of servers in the pool"
        },
        "owner": {
          "type": "string",
          "description": "Unique account ID of the pool owner"
        },
        "isOwner": {
          "type": "boolean",
          "description": "Whether the current user is the owner of the pool"
        },
        "members": {
          "type": "number",
          "description": "Number of members in the pool"
        },
        "ownShare": {
          "type": "number",
          "description": "Share of the credits in this pool that are owned by the current user"
        },
        "ownCredits": {
          "type": "number",
          "description": "Number of credits in the pool that are owned by the current user"
        }
      }
    }
  }
}
```

#### List pool members [GET](https://developers.exaroton.com/#credit-pools-get-2)`/billing/pools/{pool}/members/`

#### Example URI

GET https://api.exaroton.com/v1/billing/pools/pool/members/

**URI Parameters**

HideShow

pool
:   `PoolID` (required)

    Unique pool ID

**Request**

HideShow

##### Headers

```
Authorization: Bearer {apitoken}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": null,
  "data": [
    {
      "account": "X4iJREgqBGFSBtn0",
      "name": "example",
      "share": 1,
      "credits": 42,
      "isOwner": true
    }
  ]
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "array",
        "null"
      ]
    }
  }
}
```

#### List pool servers [GET](https://developers.exaroton.com/#credit-pools-get-3)`/billing/pools/{pool}/servers/`

#### Example URI

GET https://api.exaroton.com/v1/billing/pools/pool/servers/

**URI Parameters**

HideShow

pool
:   `PoolID` (required)

    Unique pool ID

**Request**

HideShow

##### Headers

```
Authorization: Bearer {apitoken}
```

**Response  `200`**

HideShow

##### Headers

```
Content-Type: application/json
```

##### Body

```
{
  "success": true,
  "error": null,
  "data": [
    {
      "id": "EwYiY9IAMtQBTb6U",
      "name": "example",
      "address": "example.exaroton.me",
      "motd": "Welcome to the server of example!",
      "status": 0,
      "host": null,
      "port": null,
      "players": {
        "max": 20,
        "count": 0,
        "list": []
      },
      "software": {
        "id": "kb4p09ABvLjxzedx",
        "name": "Vanilla",
        "version": "1.16.5"
      },
      "shared": false
    }
  ]
}
```

##### Schema

```
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "error": {
      "type": [
        "string",
        "null"
      ]
    },
    "data": {
      "type": [
        "array",
        "null"
      ]
    }
  }
}
```

Generated by [aglio](https://github.com/danielgtaylor/aglio) on 21 Jul 2026