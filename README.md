# 阿里云函数计算工具集

![npm](https://img.shields.io/npm/v/fc-toolkit)
[![Travis (.com)][travis-image]][travis-url]
[![Coverage Github][coverage-image]][coverage-url]
[![David deps][david-image]][david-url]
[![GitHub issues](https://img.shields.io/github/issues/shimohq/fc-toolkit)](https://github.com/shimohq/fc-toolkit/issues)
[![GitHub license](https://img.shields.io/github/license/shimohq/fc-toolkit)](https://github.com/shimohq/fc-toolkit/blob/master/LICENSE)

[travis-image]: https://img.shields.io/travis/com/shimohq/fc-toolkit
[travis-url]: https://travis-ci.com/shimohq/fc-toolkit
[coverage-image]: https://img.shields.io/coveralls/shimohq/fc-toolkit.svg
[coverage-url]: https://coveralls.io/r/shimohq/fc-toolkit?branch=master
[david-image]: https://img.shields.io/david/shimohq/fc-toolkit.svg
[david-url]: https://david-dm.org/shimohq/fc-toolkit

主要功能:

1. 发布函数
2. 调用函数超过大小限制自动使用 OSS

## 安装

`npm install fc-toolkit`

## 发布函数

在函数代码目录 ~/.fc-config.json 里写入自己的 fc 配置，格式如下：

```json
{
  "fc": {
    "accountId": "<account id>",
    "accessKeyID": "<access key id>",
    "accessKeySecret": "<access key secret>",
    "region": "cn-shanghai",
    "timeout": 50000
  },
  "oss": {
    "endpoint": "<oss endpoint>",
    "accessKeyId": "<Your accessKeyId>",
    "accessKeySecret": "<Your accessKeySecret>",
    "bucket": "<Your bucket name>",
  },
  "aws": {
    "accessKeyId": "< your access key ID>",
    "secretAccessKey": "<your secret access key>",
    "bucket": "<your bucket>",
    "region": "<cn-north-1>",
    "endpoint": "<your endpoint>",
    "s3ForcePathStyle": true
  },
  "serviceName": "yourFcServiceName",
  "handler": "index.handler",
  "memorySize": 1024,
  "runtime": "nodejs10",
  "timeout": 300,
  "name": "yourFcFunctionNamePrefix",
  "version": "1.0.0,1.0.1",
  "intall": "yarn install --production",
  "zip": "zip -qr ${filepath} ./ -x *.git*",
}
```

上传命令：`npx fc-publish`


Notes:
1. `handler`,`memorySize`,`runtime`,`timeout`为可选项；
1. `install`, `zip`为可选项, 可以自定义install和zip命令, 如使用yarn install, zip时忽略特定目录
1. --si参数可以跳过install阶段
1. 函数名格式为'tom-0_0_1'，比如 package name 为'tom', version 为 1.0.1，那么函数名为'tom-1_0_1'；可以在fc-config.json中修改; 如fc-config.json中version有多个, 将同时发布多个函数
1. 由于发布时需要外网的 region，所以函数计算代码里的配置文件里的 region 不能写`-internal`，在函数计算执行时`-internal`会自动带上；
1. 由于更新代码有一定风险，只支持发布新代码。

## 调用函数

```js
// using oss
const invoke = require('fc-toolkit').initInvoker({
  oss: {
    endpoint: "<oss endpoint>",
    accessKeyId: "<Your accessKeyId>",
    accessKeySecret: "<Your accessKeySecret>",
    bucket: "<Your bucket name>"
  },
  fc: {
    accountId: "<account id>",
    accessKeyID: "<access key id>",
    accessKeySecret: "<access key secret>",
    region: "cn-shanghai",
    timeout: 50000
  }
})

// or using minio
const invoke = require('fc-toolkit').initInvoker({
  aws: {
    "accessKeyId": "< your access key ID>",
    "secretAccessKey": "<your secret access key>",
    "bucket": "<your bucket>",
    "region": "<cn-north-1>",
    "endpoint": "<your endpoint>",
    "s3ForcePathStyle": true
  },
  fc: {
    accountId: "<account id>",
    accessKeyID: "<access key id>",
    accessKeySecret: "<access key secret>",
    region: "cn-shanghai",
    timeout: 50000
  }
})

// 由于经 OSS 中转会丢失格式，body 需要为字符串格式
const result = await invoke(serviceName, functionName, body)
```

如果发送的大小或者函数计算返回的结果超过了函数计算的大小限制，会自动使用 OSS 转发和收取；

## 处理任务

```js
// 函数计算里执行的代码

const { receive, reply } = require('fc-toolkit').initReveiver(
  false, // if disable oss, defaults to false
  'aws'  // set 'aws' when using minio, defaults to 'oss'
)

async function handler (event, context, callback) {
  try {
    const body = await receive(event)
    // handle the body here..
    const returnValue = await doSomethingYouNeed(body)
    await reply(callback)(returnValue)
  } catch (e) {
    callback(e)
  }
}
```

# LICENSE

MIT
