const FCClient = require('@alicloud/fc2');
const uuid = require('uuid/v4');
const omitBy = require('lodash.omitby');
const isNil = require('lodash.isnil');

import { sizeof, retryWrapper } from '../common';
import { MAX_RAW_PAYLOAD_SIZE } from '../constants';
import { getClientByType } from '../storage';

export interface IInitInvokerOptions {
  fc: {
    accountId: string | number;
    accessKeyID: string;
    accessKeySecret: string;
    region: string;
    timeout?: number;
  };
  oss?: {
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    endpoint: string;
  };
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    region?: string;
    endpoint?: string;
    s3ForcePathStyle?: boolean;
  };
  ossThreshold?: number;
  noOSS?: boolean;
}

export type initInvokerResult = (
  serviceName: string,
  functionName: string,
  body: any,
  headers?: any
) => Promise<string | Buffer>;

export function initInvoker(options: IInitInvokerOptions): initInvokerResult {
  // 目前只有 2 种，默认使用 oss
  const storageType = options.aws ? 'aws' : 'oss';
  const storageClient = getClientByType(
    storageType,
    options.oss! || options.aws!
  );
  const fcClient = new FCClient(options.fc.accountId, options.fc);
  const ossThreshold = options.ossThreshold || MAX_RAW_PAYLOAD_SIZE;

  return async (
    serviceName: string,
    functionName: string,
    body: string | Buffer,
    headers: any = {}
  ): Promise<string | Buffer> => {
    const isBuffer = Buffer.isBuffer(body);
    if (typeof body !== 'string' && !isBuffer) {
      throw new Error('invoke body must be string or Buffr');
    }

    let type: string = 'direct';
    let rawData: string | undefined;
    let ossKey: string | undefined;

    // send with OSS key
    if (!options.noOSS && sizeof(body) > ossThreshold) {
      // storage key
      ossKey = uuid() as string;
      type = 'oss';

      await retryWrapper(() => storageClient.put(ossKey!, body));
    } else {
      rawData = isBuffer
        ? (body as Buffer).toString('base64')
        : (body as string);
    }

    const params = JSON.stringify(
      omitBy(
        {
          storeType: type,
          ossKey,
          body: rawData,
          isBuffer,
          headers,
          ossType: storageType,
        },
        (v: any) => v === undefined
      )
    );

    const res = await retryWrapper(async (bail: any) => {
      try {
        const { data } = await fcClient.invokeFunction(
          serviceName,
          functionName,
          params
        );

        if (
          typeof data === 'object' &&
          !isNil(data.errorMessage) &&
          !isNil(data.errorType) &&
          !isNil(data.stackTrace)
        ) {
          const error = new Error(data.errorMessage) as any;
          error.errorType = data.errorType;
          error.stackTrace = data.stackTrace;
          bail(error);
          return;
        }

        return data;
      } catch (err) {
        // socket hang up error, should retry
        if (
          err.name === 'ECONNRESETError' ||
          String(err.name)
            .toLowerCase()
            .indexOf('throttle') > -1
        ) {
          throw err;
        }

        bail(err);
      }
    });

    const result = typeof res === 'string' ? JSON.parse(res) : res;
    if (result.storeType === 'oss' && !options.noOSS) {
      const retBody: Buffer = (
        await retryWrapper(() => storageClient.getAsBuffer(result.body))
      ).content;
      storageClient.del(result.body).catch(console.error);

      return result.isBuffer ? retBody : retBody.toString();
    }

    return result.isBuffer ? Buffer.from(result.body, 'base64') : result.body;
  };
}
