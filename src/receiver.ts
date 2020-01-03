import * as bufferSupport from './bufferSupport/receiver';

export type AliyunCallback = bufferSupport.AliyunCallback;
export type OSS_TYPE = bufferSupport.OSS_TYPE;
export interface IPayloadObject {
  [index: string]: any;
}

export type IReceiveParsedPayload = bufferSupport.IReceiveParsedPayload;
export type IReplyPayload = bufferSupport.IReplyPayload;

export function initReceiver(
  noOSS: boolean = false,
  ossType: OSS_TYPE = 'oss'
): {
  receive: (event: string) => Promise<IPayloadObject>;
  reply: bufferSupport.replyFunc;
} {
  const { receive, reply } = bufferSupport.initReceiver(noOSS, ossType, 0);

  return {
    receive: (event: string | IReceiveParsedPayload) =>
      receive(event).then(res => JSON.parse(res.body.toString())),
    reply,
  };
}
