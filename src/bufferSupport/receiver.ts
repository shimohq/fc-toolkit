const path = require('path');
const uuid = require('uuid/v4');
const isPlainObject = require('lodash.isplainobject');
const isNil = require('lodash.isnil');
const omitBy = require('lodash.omitby');

import { sizeof, retryWrapper } from '../common';
import { MAX_RAW_PAYLOAD_SIZE } from '../constants';
import { getClientByType } from '../storage';
import { StorageEngine } from '../types';
import { loadConfigWithEnvs } from '../config';

export type AliyunCallback = (error: any, response: IReplyPayload) => any;
export type OSS_TYPE = 'oss' | 'aws';
export type replyFunc = (
  callback: AliyunCallback
) => (
  returnValue: string | Buffer,
  directReturn?: boolean,
  meta?: any
) => Promise<void>;

export interface IReceiveParsedPayload {
  storeType: string;
  ossType: string;
  body: string;
  ossKey?: string;
  headers?: any;
  isBuffer?: boolean;
}

export interface ILogger {
  debug(...data: any[]): void;
  info(...data: any[]): void;
  warn(...data: any[]): void;
  error(...data: any[]): void;
  log(...data: any[]): void;
}

export interface IReceiverContext {
  logger?: ILogger;
}

export interface IReplyPayload {
  storeType: string;
  isBuffer?: boolean;
  body: string;
  meta?: any;
}

export interface IReceiveResponse {
  headers?: any;
  body: any;
  storeType?: string;
  cleanup: () => Promise<void>;
}

export function initReceiver(
  noOSS: boolean = false,
  ossType: StorageEngine = StorageEngine.ALIYUN_OSS,
  ossThreshold: number = 0
): {
  receive: (
    event: Buffer | string | IReceiveParsedPayload,
    context?: IReceiverContext
  ) => Promise<IReceiveResponse>;
  reply: replyFunc;
} {
  const fcConfig = loadConfigWithEnvs(ossType);
  const storageOptions = fcConfig[ossType] || ({} as any);
  const storageClient = getClientByType(ossType, storageOptions);

  const receive = async (
    event: Buffer | string | IReceiveParsedPayload,
    context: IReceiverContext = {}
  ): Promise<IReceiveResponse> => {
    const logger = context.logger ?? console
    let storeType: string;
    let ossKey: string | undefined;
    let body: any;
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

      const resp = await retryWrapper(() =>
        storageClient.getAsBuffer(ossKey as string)
      );
      if (!resp) {
        throw new Error(`oss:${ossKey} get empty content`);
      }
      const content: Buffer = resp.content;

      const cleanup = () => storageClient.del(ossKey as string).catch(logger.error);

      return omitBy(
        { headers, body: isBuffer ? content : content.toString(), storeType, cleanup },
        (v: any) => v === undefined
      );
    }

    return omitBy(
      { headers, body: isBuffer ? Buffer.from(body, 'base64') : body, cleanup: () => Promise.resolve(void 0) },
      (v: any) => v === undefined
    );
  };

  const reply = (callback: AliyunCallback) => {
    return async (
      returnValue: string | Buffer,
      directReturn: boolean = false,
      meta?: any
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
          isBuffer,
          body: filePath,
          meta,
        };
        const ossMeta = new Map<string, any>();
        ossMeta.set('length', Buffer.byteLength(returnValue));

        await retryWrapper(() =>
          storageClient.put(filePath, returnValue, { meta: ossMeta })
        );
        return callback(null, body);
      }

      callback(null, {
        storeType: 'direct',
        isBuffer,
        body: isBuffer
          ? (returnValue as Buffer).toString('base64')
          : (returnValue as string),
        meta,
      });
    };
  };

  return { receive, reply };
}
