const path = require('path');
const uuid = require('uuid/v4');
const isPlainObject = require('lodash.isplainobject');
const isNil = require('lodash.isnil');

import { sizeof, retryWrapper } from '../common';
import { MAX_RAW_PAYLOAD_SIZE } from '../constants';
import { getClientByType } from '../storage';

export type AliyunCallback = (error: any, response: IReplyPayload) => any;
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
export interface IReplyPayload {
  storeType: string;
  body: string;
}

export function initReceiver(
  noOSS: boolean = false,
  ossType: OSS_TYPE = 'oss',
  ossThreshold: number = 0
): {
  receive: (
    event: string | IReceiveParsedPayload
  ) => Promise<IPayloadObject | Buffer>;
  reply: (
    callback: AliyunCallback
  ) => (returnValue: string | Buffer, directReturn?: boolean) => Promise<void>;
} {
  const cwd = process.cwd();
  const config = require(path.join(cwd, './.fc-config.json'));
  const storageOptions = config[ossType] || {};
  const storageClient = getClientByType(ossType, storageOptions);

  const receive = async (
    event: string | IReceiveParsedPayload
  ): Promise<IPayloadObject | Buffer> => {
    let storeType: string;
    let ossKey: string | undefined;
    let body: IPayloadObject;

    // 如果是字符串才进行 parse
    if (typeof event === 'string') {
      try {
        const eventParsed = JSON.parse(event);
        storeType = eventParsed.storeType;
        ossKey = eventParsed.ossKey;
        body = eventParsed.body;
      } catch (err) {
        throw new Error(`Parse event string error: ${err.message}`);
      }
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

      const content: Buffer = (await retryWrapper(() =>
        storageClient.get(ossKey as string)
      )).content;

      storageClient.del(ossKey as string).catch(console.error);

      return content;

      // 从对象存储中取回数据需要再解析一次
      // try {
      //   body = JSON.parse(resultString);
      // } catch (err) {
      //   throw new Error(`Parse object content error: ${err.message}`);
      // }
    }

    // 经过以上步骤后，发现还是 string ,尝试一次 parse
    // 理论上应该只有 storeType 为 oss 时，才是 string
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (err) {
        throw new Error(`Try parse body error: ${err.message}`);
      }
    }

    return body;
  };

  const reply = (callback: AliyunCallback) => {
    return async (
      returnValue: string | Buffer,
      directReturn: boolean = false
    ) => {
      const isBuffer = Buffer.isBuffer(returnValue);
      if (typeof returnValue !== 'string' && !isBuffer) {
        throw new Error('return value must be string or Buffer');
      }

      if (
        !noOSS &&
        !directReturn &&
        sizeof(returnValue) > (ossThreshold || MAX_RAW_PAYLOAD_SIZE)
      ) {
        const filePath = uuid();
        const body: IReplyPayload = {
          storeType: 'oss',
          body: filePath,
        };

        await retryWrapper(() => storageClient.put(filePath, returnValue));

        return callback(null, body);
      }

      callback(null, {
        storeType: 'direct',
        body: returnValue.toString(),
      });
    };
  };

  return { receive, reply };
}
