import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, loadConfigWithEnvs } from '../src/config';
import { StorageEngine } from '../src/types';

describe('receiver test cases', () => {
  beforeAll(() => {
    const cwd = process.cwd();
    fs.writeFileSync(
      path.join(cwd, './.fc-config.json'),
      JSON.stringify({
        EnvironmentVariables: {
          OSS_ID: 'your oss id',
          OSS_SECRET: 'your oss secret',
          OSS_BUCKET: 'fc-task',
          OSS_ENDPOINT: 'oss-cn-beijing.aliyuncs.com',
        },
        aws: {
          accessKeyId: 'your aws id',
          secretAccessKey: 'your aws secret',
          bucket: 'fc-task',
          region: 'cn-north-1',
          endpoint: 'http://your-endpoint:8080',
          s3ForcePathStyle: true,
        },
      })
    );
  });

  describe('load config', () => {
    it('should load config ok', async () => {
      const config = loadConfig() as any;
      expect(config.aws.accessKeyId).toEqual('your aws id');
      expect(config.aws.secretAccessKey).toEqual('your aws secret');
      expect(config.aws.region).toEqual('cn-north-1');
      expect(config.aws.bucket).toEqual('fc-task');
      expect(config.aws.endpoint).toEqual('http://your-endpoint:8080');
      expect(config.aws.s3ForcePathStyle).toBeTruthy();

      expect(config.EnvironmentVariables).toMatchObject({
        OSS_ID: 'your oss id',
        OSS_SECRET: 'your oss secret',
        OSS_BUCKET: 'fc-task',
        OSS_ENDPOINT: 'oss-cn-beijing.aliyuncs.com',
      });
    });

    it('should load config with env ok', async () => {
      process.env.OSS_ID = 'some oss id';
      process.env.OSS_SECRET = 'some oss key secret';
      process.env.OSS_BUCKET = 'some oss bucket name';
      process.env.OSS_ENDPOINT = 'some oss endpoint';

      process.env.AWS_S3_ID = 'some aws id';
      process.env.AWS_S3_SECRET = 'some aws secret';
      process.env.AWS_S3_BUCKET_FC_TASK = 'some aws bucket name';
      process.env.AWS_S3_REGION = 'some region';
      process.env.AWS_S3_ENDPOINT = 'some endpoint';
      process.env.AWS_S3_FORCE_PATH_STYLE = 'true';

      const configOSS = loadConfigWithEnvs(StorageEngine.ALIYUN_OSS);
      const configAWS = loadConfigWithEnvs(StorageEngine.AWS_S3);

      expect(configOSS.oss).toMatchObject({
        accessKeyId: 'some oss id',
        accessKeySecret: 'some oss key secret',
        bucket: 'some oss bucket name',
        endpoint: 'some oss endpoint',
      });

      expect(configAWS.aws).toMatchObject({
        accessKeyId: 'some aws id',
        secretAccessKey: 'some aws secret',
        bucket: 'some aws bucket name',
        region: 'some region',
        endpoint: 'some endpoint',
        s3ForcePathStyle: true,
      });

      delete process.env.OSS_ID;
      delete process.env.OSS_SECRET;
      delete process.env.OSS_BUCKET;
      delete process.env.OSS_ENDPOINT;
      delete process.env.AWS_S3_ID;
      delete process.env.AWS_S3_SECRET;
      delete process.env.AWS_S3_BUCKET_FC_TASK;
      delete process.env.AWS_S3_REGION;
      delete process.env.AWS_S3_ENDPOINT;
      delete process.env.AWS_S3_FORCE_PATH_STYLE;
    });
  });

  afterAll(() => {
    const cwd = process.cwd();
    fs.unlinkSync(path.join(cwd, './.fc-config.json'));
  });
});
