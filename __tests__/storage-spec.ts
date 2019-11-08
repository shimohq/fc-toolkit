import { Client as AWOS } from 'awos-js';

import { getClientByType } from '../src/storage';

describe('storage', () => {
  it('should get storage client by type ok', () => {
    const client = getClientByType('oss', {
      accessKeyId: 'your key id',
      accessKeySecret: 'your secret key',
      bucket: 'bucket',
      endpoint: 'oss-cn-beijing.aliyuncs.com',
    });
    expect(client instanceof AWOS).toBeTruthy();

    const client1 = getClientByType('aws', {
      accessKeyId: 'your key id',
      secretAccessKey: 'your secret key',
      bucket: 'key',
      endpoint: 'http://localhost:9000',
      s3ForcePathStyle: true,
      region: 'cn-north-1',
    });
    expect(client1 instanceof AWOS).toBeTruthy();

    try {
      getClientByType('abc', {
        accessKeyId: 'your key id',
        secretAccessKey: 'your secret key',
        bucket: 'key',
        endpoint: 'http://localhost:9000',
        s3ForcePathStyle: true,
        region: 'cn-north-1',
      });
    } catch (err) {
      expect(err.message).toContain('Unknown store type:');
    }
  });
});
