const path = require('path');
const uuid = require('uuid/v4');
const isPlainObject = require('lodash.isplainobject');
const isNil = require('lodash.isnil');

import { sizeof, retryWrapper } from './common';
import { MAX_RAW_PAYLOAD_SIZE } from './constants';
import { getClientByType } from './storage';

export type AliyunCallback = (error: any, response: any) => any;
export type OSS_TYPE = 'oss' | 'aws';
export interface IPayloadObject {
  [index: string]: any;
}
export interface IReceiveParsedPayload {
  storeType: string;
  ossType: string;
  body: IPayloadObject;
  ossKey?: string;
}

export function initReceiver(
  noOSS: boolean = false,
  ossType: OSS_TYPE = 'oss'
): {
  receive: (event: string) => Promise<any>;
  reply: (
    callback: AliyunCallback
  ) => (returnValue: string, directReturn?: boolean) => Promise<void>;
} {
  const cwd = process.cwd();
  const config = require(path.join(cwd, './.fc-config.json'));
  const storageOptions = config[ossType] || {};
  const storageClient = getClientByType(ossType, storageOptions);

  const receive = async (
    event: string | IReceiveParsedPayload
  ): Promise<any> => {
    let storeType: string;
    let ossKey: string | undefined;
    let body: IPayloadObject;

    // 如果是字符串才进行 parse
    if (typeof event === 'string') {
      const eventParsed = JSON.parse(event);
      storeType = eventParsed.storeType;
      ossKey = eventParsed.ossKey;
      body = eventParsed.body;
    } else if (isPlainObject(event)) {
      // 如果外部已经解析，此处直接取值
      storeType = event.storeType;
      ossKey = event.ossKey;
      body = event.body;
    } else {
      throw new Error(
        'Unsupported event data type, should be a plain object or a string'
      );
    }

    // 如果是标记为对象存储类型，则尝试取出
    if (storeType === 'oss' && !noOSS) {
      if (isNil(ossKey)) {
        throw new Error('Option `ossKey` is required using object storage');
      }

      if (typeof ossKey !== 'string') {
        throw new Error('Option `ossKey` must be a string');
      }

      const resultString = (await retryWrapper(() =>
        storageClient.get(ossKey as string)
      )).content.toString();

      storageClient.del(ossKey as string).catch(console.error);

      // 从对象存储中取回数据需要再解析一次
      body = JSON.parse(resultString);
    }

    // 经过以上步骤后，发现还是 string ,尝试一次 parse
    // 理论上应该只有 storeType 为 oss 时，才是 string
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    return body;
  };

  const reply = (callback: AliyunCallback) => {
    return async (returnValue: string, directReturn: boolean = false) => {
      if (typeof returnValue !== 'string') {
        throw new Error('return value must be string');
      }

      if (
        !noOSS &&
        !directReturn &&
        sizeof(returnValue) > MAX_RAW_PAYLOAD_SIZE
      ) {
        const filePath = uuid();
        const body = {
          storeType: 'oss',
          body: filePath,
        };

        await retryWrapper(() => storageClient.put(filePath, returnValue));

        return callback(null, body);
      }

      callback(null, {
        storeType: 'direct',
        body: returnValue,
      });
    };
  };

  return { receive, reply };
}
