import { Client as AWOS } from 'awos-js';
import { IOSSOptions } from 'awos-js/lib/oss';
import { IAWSOptions } from 'awos-js/lib/aws';

const clientMap: any = {}

export function getClientByType(
  storeType: string,
  options: IOSSOptions | IAWSOptions
): AWOS {
  switch (storeType) {
    case 'oss':
      const ossClientKey = options.accessKeyId + options.bucket + options.endpoint
      if (clientMap[ossClientKey]) {
        return clientMap[ossClientKey]
      }
      const ossClient = new AWOS({
        type: 'oss',
        ossOptions: options as IOSSOptions,
      });
      clientMap[ossClientKey] = ossClient
      return ossClient
    case 'aws':
      const awsClientKey = options.accessKeyId + options.bucket + options.endpoint
      if (clientMap[awsClientKey]) {
        return clientMap[awsClientKey]
      }
      const awsClient = new AWOS({
        type: 'aws',
        awsOptions: options as IAWSOptions,
      });
      clientMap[awsClientKey] = awsClient
      return awsClient
    default:
      throw new Error('Unknown store type: ' + storeType);
  }
}
