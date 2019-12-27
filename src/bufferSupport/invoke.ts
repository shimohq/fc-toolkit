const FCClient = require('@alicloud/fc2');
const uuid = require('uuid/v4');

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
  bufferOssResp?: boolean;
  noOSS?: boolean;
}

export type initInvokerResult = (
  serviceName: string,
  functionName: string,
  body: any
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
    body: string | Buffer
  ): Promise<string | Buffer> => {
    const isBuffer = Buffer.isBuffer(body);
    if (typeof body !== 'string' && !isBuffer) {
      throw new Error('invoke body must be string or Buffr');
    }

    let type: string = 'direct';
    let rawDataOrKey: string;

    // send with OSS key
    if (!options.noOSS && sizeof(body) > ossThreshold) {
      // storage key
      rawDataOrKey = uuid();
      type = 'oss';

      await retryWrapper(() => storageClient.put(rawDataOrKey, body));
    } else {
      rawDataOrKey = body.toString();
    }

    const params = JSON.stringify({
      storeType: type,
      body: rawDataOrKey,
    });

    const res = await retryWrapper(async (bail: any) => {
      try {
        const { data } = await fcClient.invokeFunction(
          serviceName,
          functionName,
          params
        );

        if (typeof data === 'object') {
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

    const result = JSON.parse(res);

    if (result.storeType === 'oss' && !options.noOSS) {
      const retBody: Buffer = (await retryWrapper(() =>
        storageClient.get(result.body)
      )).content;
      storageClient.del(result.body).catch(console.error);

      return options.bufferOssResp ? retBody : retBody.toString();
    }

    return result.body;
  };
}
