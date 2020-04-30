import { IOSSOptions } from 'awos-js/lib/oss';
import { IAWSOptions } from 'awos-js/lib/aws';

// 存储引擎类型
export enum StorageEngine {
  ALIYUN_OSS = 'oss',
  AWS_S3 = 'aws',
}

export interface IConfigurationV1 {
  serviceName: string;
  handler: string;
  memorySize: number;
  runtime: string;
  timeout: number;
  fc: IFcConfigurationV1;
  aws?: IAWSOptions;
  oss?: IOSSOptions;
  EnvironmentVariables?: IEnvVars;
}

export interface IFcConfigurationV1 {
  accountId: string;
  accessKeyID: string;
  accessKeySecret: string;
  region: string;
  timeout: number;
}

export interface IEnvVars {
  [envKey: string]: string;
}

export type Nullable<T> = T | undefined;
