import * as path from 'path';
import yn = require('yn');

import { StorageEngine, IConfigurationV1 } from './types';

/**
 * 加载配置并通过环境变量覆盖部分配置
 *
 * @param {StorageEngine} storageEngine 存储引擎类型： oss/aws
 * @return {IConfigurationV1}
 */
export function loadConfigWithEnvs(
  storageEngine: StorageEngine = StorageEngine.ALIYUN_OSS
): IConfigurationV1 {
  const fcConfigWithEnvs = loadConfig();

  if (storageEngine === StorageEngine.ALIYUN_OSS && process.env.OSS_ID) {
    fcConfigWithEnvs.oss = {
      accessKeyId: process.env.OSS_ID || 'no access id',
      accessKeySecret: process.env.OSS_SECRET || 'no access key secret',
      bucket: process.env.OSS_BUCKET || 'your bucket name',
      endpoint: process.env.OSS_ENDPOINT || 'some oss endpoint',
    };
  } else if (storageEngine === StorageEngine.AWS_S3) {
    fcConfigWithEnvs.aws = fcConfigWithEnvs.aws || ({} as any);
    fcConfigWithEnvs.aws!.accessKeyId =
      process.env.AWS_S3_ID || fcConfigWithEnvs.aws!.accessKeyId;
    fcConfigWithEnvs.aws!.secretAccessKey =
      process.env.AWS_S3_SECRET || fcConfigWithEnvs.aws!.secretAccessKey;
    fcConfigWithEnvs.aws!.bucket =
      process.env.AWS_S3_BUCKET_FC_TASK || fcConfigWithEnvs.aws!.bucket;
    fcConfigWithEnvs.aws!.region =
      process.env.AWS_S3_REGION || fcConfigWithEnvs.aws!.region;
    fcConfigWithEnvs.aws!.endpoint =
      process.env.AWS_S3_ENDPOINT || fcConfigWithEnvs.aws!.endpoint;
    fcConfigWithEnvs.aws!.signatureVersion =
      process.env.AWS_S3_SIGNATURE_VERSION || fcConfigWithEnvs.aws!.signatureVersion;
    // 如果需要使用官方 S3，在环境变量中设为 false
    fcConfigWithEnvs.aws!.s3ForcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE
      ? yn(process.env.AWS_S3_FORCE_PATH_STYLE)
      : fcConfigWithEnvs.aws!.s3ForcePathStyle;
  }

  return fcConfigWithEnvs;
}

/**
 * 从配置文件加载配置
 *
 * @return {IConfigurationV1}
 */
export function loadConfig(): IConfigurationV1 {
  const cwd = process.cwd();
  const fcConfig: IConfigurationV1 = require(path.join(
    cwd,
    './.fc-config.json'
  ));
  return fcConfig;
}
