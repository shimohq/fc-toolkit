const FCClient = require('@alicloud/fc2');
const uuid = require('uuid/v4');

import { sizeof, retryWrapper } from './common';
import { MAX_RAW_PAYLOAD_SIZE } from './constants';
import { getClientByType } from './storage';

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
  body: any
) => Promise<string>;

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
    body: string
  ): Promise<string> => {
    if (typeof body !== 'string') {
      throw new Error('invoke body must be a string');
    }

    const fcBody = [serviceName, functionName];
    let type: string = 'direct';
    let rawDataOrKey: string = body;

    // send with OSS key
    if (!options.noOSS && sizeof(body) > ossThreshold) {
      // storage key
      rawDataOrKey = uuid();
      type = 'oss';

      await retryWrapper(() => storageClient.put(rawDataOrKey, body));
    }

    fcBody.push(
      JSON.stringify({
        storeType: type,
        body: rawDataOrKey,
      })
    );

    const res = await retryWrapper(async (bail: any) => {
      try {
        const { data } = await fcClient.invokeFunction(...fcBody);

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
      const retBodyString = (await retryWrapper(() =>
        storageClient.get(result.body)
      )).content.toString();

      storageClient.del(result.body).catch(console.error);

      return retBodyString;
    }

    return result.body;
  };
}
