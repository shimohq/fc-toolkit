const OSS = require('ali-oss');
const FCClient = require('@alicloud/fc2');
const uuid = require('uuid/v4');

import { sizeof, retryWrapper } from './common';

export function initInvoker(options: {
  oss: {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
  };
  fc: {
    accountId: string | number;
    accessKeyID: string;
    accessKeySecret: string;
    region: string;
    timeout?: number;
  };
  ossThreshold?: number;
  noOSS?: boolean;
}): (serviceName: string, functionName: string, body: any) => Promise<string> {
  const ossClient = new OSS(options.oss);
  const fcClient = new FCClient(options.fc.accountId, options.fc);
  const ossThreshold = options.ossThreshold || 2e6;

  return async (
    serviceName: string,
    functionName: string,
    body: string
  ): Promise<string> => {
    if (typeof body !== 'string') {
      throw new Error('invoke body must be a string');
    }

    const fcBody = [serviceName, functionName];

    // send via OSS
    if (sizeof(body) > ossThreshold && !options.noOSS) {
      const filePath = uuid();
      await retryWrapper(() => ossClient.put(filePath, Buffer.from(body)));
      fcBody.push(
        JSON.stringify({
          storeType: 'oss',
          body: filePath,
        })
      );
    } else {
      fcBody.push(
        JSON.stringify({
          storeType: 'direct',
          body,
        })
      );
    }

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
        ossClient.get(result.body)
      )).content.toString();
      ossClient.delete(result.body).catch(console.error);
      return retBodyString;
    }

    return result.body;
  };
}
