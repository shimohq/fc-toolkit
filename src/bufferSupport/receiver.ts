const path = require('path');
const uuid = require('uuid/v4');
const isPlainObject = require('lodash.isplainobject');
const isNil = require('lodash.isnil');
const omitBy = require('lodash.omitby');

import { sizeof, retryWrapper } from '../common';
import { MAX_RAW_PAYLOAD_SIZE } from '../constants';
import { getClientByType } from '../storage';

export type AliyunCallback = (error: any, response: IReplyPayload) => any;
export type OSS_TYPE = 'oss' | 'aws';

export interface IReceiveParsedPayload {
  storeType: string;
  ossType: string;
  body: string;
  ossKey?: string;
  headers?: any;
  isBuffer?: boolean;
}
export interface IReplyPayload {
  storeType: string;
  isBuffer?: boolean;
  body: string;
}

export function initReceiver(
  noOSS: boolean = false,
  ossType: OSS_TYPE = 'oss',
  ossThreshold: number = 0
): {
  receive: (
    event: Buffer | string | IReceiveParsedPayload
  ) => Promise<{ headers?: any; body: string | Buffer }>;
  reply: (
    callback: AliyunCallback
  ) => (returnValue: string | Buffer, directReturn?: boolean) => Promise<void>;
} {
  const cwd = process.cwd();
  const config = require(path.join(cwd, './.fc-config.json'));
  const storageOptions = config[ossType] || {};
  const storageClient = getClientByType(ossType, storageOptions);

  const receive = async (
    event: Buffer | string | IReceiveParsedPayload
  ): Promise<{ headers?: any; body: string | Buffer }> => {
    let storeType: string;
    let ossKey: string | undefined;
    let body: string;
    let headers: any;
    let isBuffer: boolean;

    // 如果是字符串才进行 parse
    if (typeof event === 'string' || Buffer.isBuffer(event)) {
      try {
        const eventParsed = JSON.parse(event.toString());
        storeType = eventParsed.storeType;
        ossKey = eventParsed.ossKey;
        body = eventParsed.body;
        headers = eventParsed.headers;
        isBuffer = eventParsed.isBuffer;
      } catch (err) {
        throw new Error(`Parse event string error: ${err.message}`);
      }
    } else if (isPlainObject(event)) {
      // 如果外部已经解析，此处直接取值
      storeType = event.storeType;
      ossKey = event.ossKey;
      body = event.body;
      headers = event.headers;
      isBuffer = event.isBuffer || false;
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
        storageClient.getAsBuffer(ossKey as string)
      )).content;

      storageClient.del(ossKey as string).catch(console.error);

      return omitBy(
        { headers, body: isBuffer ? content : content.toString() },
        (v: any) => v === undefined
      );
    }

    return omitBy(
      { headers, body: isBuffer ? Buffer.from(body, 'base64') : body },
      (v: any) => v === undefined
    );
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
        isBuffer,
        body: isBuffer
          ? (returnValue as Buffer).toString('base64')
          : (returnValue as string),
      });
    };
  };

  return { receive, reply };
}
