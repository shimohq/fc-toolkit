import * as bufferSupport from './bufferSupport/receiver';
import { StorageEngine } from './types';

export type AliyunCallback = bufferSupport.AliyunCallback;
export type IReceiveParsedPayload = bufferSupport.IReceiveParsedPayload;
export type IReplyPayload = bufferSupport.IReplyPayload;

export function initReceiver(
  noOSS: boolean = false,
  ossType: StorageEngine = StorageEngine.ALIYUN_OSS
): {
  receive: (event: string | IReceiveParsedPayload) => Promise<any>;
  reply: bufferSupport.replyFunc;
} {
  const { receive, reply } = bufferSupport.initReceiver(noOSS, ossType, 0);

  return {
    receive: (event: string | IReceiveParsedPayload) =>
      receive(event).then(res => {
        if (res.storeType === 'oss') {
          try {
            const body = JSON.parse(res.body);
            return body;
          } catch (err) {
            throw new Error(`Parse object content error: ${err.message}`);
          }
        }

        return res.body;
      }),
    reply,
  };
}
