const OSS = require('ali-oss');
const FCClient = require('@alicloud/fc2');
const uuid = require('uuid/v4');

import { sizeof } from './common';

const client = new OSS({
  region: '<oss region>',
  accessKeyId: '<Your accessKeyId>',
  accessKeySecret: '<Your accessKeySecret>',
  bucket: '<Your bucket name>',
});

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
    if (sizeof(body) > ossThreshold) {
      const filePath = uuid();
      await ossClient.put(filePath, Buffer.from(body));
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

    const { data } = await fcClient.invokeFunction(...fcBody);

    if (typeof data === 'object') {
      const error = new Error(data.errorMessage) as any;
      error.errorType = data.errorType;
      error.stackTrace = data.stackTrace;
      throw error;
    }

    const result = JSON.parse(data);

    if (result.storeType === 'oss') {
      const retBodyString = (await ossClient.get(
        result.body
      )).content.toString();
      ossClient.delete(result.body).catch(console.error);
      return retBodyString;
    }

    return result.body;
  };
}
