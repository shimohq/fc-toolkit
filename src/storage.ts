import { Client as AWOS } from 'awos-js';
import { IOSSOptions } from 'awos-js/lib/oss';
import { IAWSOptions } from 'awos-js/lib/aws';

export function getClientByType(
  storeType: string,
  options: IOSSOptions | IAWSOptions
): AWOS {
  switch (storeType) {
    case 'oss':
      return new AWOS({
        type: 'oss',
        ossOptions: options as IOSSOptions,
      });
    case 'aws':
      return new AWOS({
        type: 'aws',
        awsOptions: options as IAWSOptions,
      });
    default:
      throw new Error('Unknown store type: ' + storeType);
  }
}
