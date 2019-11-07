import { Client as AWOS } from 'awos-js';

import { getClientByType } from '../src/storage'

describe('storage', () => {
  const client = getClientByType('oss', {
    accessKeyId: '',
    accessKeySecret: '',
    bucket: '',
    endpoint: '',
  })
  expect(client instanceof AWOS).toBeTruthy()

  const client1 = getClientByType('aws', {
    accessKeyId: '',
    secretAccessKey: '',
    bucket: '',
    endpoint: '',
    s3ForcePathStyle: true,
    region: '',
  })
  expect(client1 instanceof AWOS).toBeTruthy()

  try {
    getClientByType('abc', {
      accessKeyId: '',
      secretAccessKey: '',
      bucket: '',
      endpoint: '',
      s3ForcePathStyle: true,
      region: '',
    })
  } catch (err) {
    expect(err).toContain('Unknown store type:')
  }
})
