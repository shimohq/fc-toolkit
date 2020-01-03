const sinon = require('sinon');
const uuid = require('uuid');

import * as fs from 'fs';
import * as path from 'path';

import * as Receiver from '../src/bufferSupport/receiver';
import * as storage from '../src/storage';
import FakeStorage from './mock/storage';

const sandbox = sinon.createSandbox();
const fakeStorage = new FakeStorage();

describe('receiver test cases', () => {
  beforeAll(() => {
    const cwd = process.cwd();
    fs.writeFileSync(path.join(cwd, './.fc-config.json'), '{}')
    sandbox.stub(storage, 'getClientByType').callsFake(() => fakeStorage)
  })

  describe('should receive works normally', () => {
    describe('when storeType is direct', () => {
      it('when the type of event is string', async () => {
        const { receive } = Receiver.initReceiver()
        const resp = await receive(JSON.stringify({
          body: 'test message',
          ossType: 'oss',
          storeType: 'direct'
        }))
        expect(resp.body).toBe('test message')
      })

      it('when the type of event is object', async () => {
        const { receive } = Receiver.initReceiver()
        const resp = await receive({
          body: 'test message',
          ossType: 'oss',
          storeType: 'direct'
        })
        expect(resp.body).toBe('test message')
      })

      it('when the type of event is Buffer', async () => {
        const { receive } = Receiver.initReceiver()
        const bufferEvent = Buffer.from(JSON.stringify({
          body: 'test message',
          ossType: 'oss',
          storeType: 'direct'
        }))
        const resp = await receive(bufferEvent)
        expect(resp.body.toString()).toBe('test message')
      })

      it('should the type of resp.body be Buffer, when event.isBuffer is true', async () => {
        const { receive } = Receiver.initReceiver()
        const resp = await receive({
          body: Buffer.from('test message').toString('base64'),
          ossType: 'oss',
          storeType: 'direct',
          isBuffer: true,
        })
        expect(Buffer.isBuffer(resp.body)).toBeTruthy()
        expect(resp.body.toString()).toBe('test message')
      })
    })

    describe('when storeType is oss', () => {
      beforeEach(async () => {
        this.key = uuid.v4();
        this.content = 'aaa';
        await fakeStorage.put(this.key, this.content)
      })

      afterEach(async () => {
        const data = await fakeStorage.getAsBuffer(this.key)
        expect(data).toBeFalsy()
      })

      it('should get content from oss works normally', async () => {
        const { receive } = Receiver.initReceiver()
        const resp = await receive({
          body: '',
          ossType: 'oss',
          storeType: 'oss',
          ossKey: this.key,
        })
        expect(resp.body).toBe(this.content)
      })

      it('should the type of resp.body be Buffer, when event.isBuffer is true', async () => {
        const { receive } = Receiver.initReceiver()
        const resp = await receive({
          body: '',
          ossType: 'oss',
          storeType: 'oss',
          ossKey: this.key,
          isBuffer: true,
        })
        expect(Buffer.isBuffer(resp.body)).toBeTruthy()
        expect(resp.body.toString()).toBe(this.content)
      })
    })
  })

  describe('should reply works normally', () => {
    it('when return value is string', done => {
      const { reply } = Receiver.initReceiver()
      const cb = (err, data) => {
        expect(err).toBeFalsy()
        expect(data).toEqual({
          storeType: 'direct',
          isBuffer: false,
          body: 'foooo'
        })
        done()
      }
      reply(cb)('foooo')
    })
  
    it('when return value is Buffer', done => {
      const { reply } = Receiver.initReceiver()
      const cb = (err, data) => {
        expect(err).toBeFalsy()
        expect(data).toEqual({
          storeType: 'direct',
          isBuffer: true,
          body: Buffer.from('foooo').toString('base64')
        })
        done()
      }
      reply(cb)(Buffer.from('foooo'))
    })

    it('when return value is oss key', done => {
      const { reply } = Receiver.initReceiver(false, 'oss', 10)
      const cb = (err, data) => {
        expect(err).toBeFalsy()
        expect(data.storeType).toBe('oss')
        fakeStorage.getAsBuffer(data.body).then(resp => {
          expect(resp.content.toString()).toBe('fooooooooooooo')
          done()
        })
      }
      reply(cb)('fooooooooooooo')
    })

    it('when meta is set', done => {
      const { reply } = Receiver.initReceiver()
      const meta = new Map<string, any>();
      const body = 'foooo'
      meta.set('length', body.length)
      const cb = (err, data) => {
        expect(err).toBeFalsy()
        expect(data).toEqual({
          storeType: 'direct',
          isBuffer: false,
          body,
          meta,
        })
        done()
      }
      reply(cb)(body, false, meta)
    })
  })

  afterAll(() => {
    sandbox.reset();
    const cwd = process.cwd();
    fs.unlinkSync(path.join(cwd, './.fc-config.json'))
  })
})
