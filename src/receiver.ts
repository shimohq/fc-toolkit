import * as bufferSupport from './bufferSupport/receiver';

export type AliyunCallback = bufferSupport.AliyunCallback;
export type OSS_TYPE = bufferSupport.OSS_TYPE;
export type IPayloadObject = bufferSupport.IPayloadObject;

export type IReceiveParsedPayload = bufferSupport.IReceiveParsedPayload;
export type IReplyPayload = bufferSupport.IReplyPayload;

export function initReceiver(
  noOSS: boolean = false,
  ossType: OSS_TYPE = 'oss'
): {
  receive: (event: string) => Promise<IPayloadObject>;
  reply: (
    callback: AliyunCallback
  ) => (returnValue: string, directReturn?: boolean) => Promise<void>;
} {
  const { receive, reply } = bufferSupport.initReceiver(noOSS, ossType, 0);

  return {
    receive: (event: string | IReceiveParsedPayload) =>
      receive(event).then(
        res => (Buffer.isBuffer(res) ? JSON.parse(res.toString()) : res)
      ),
    reply,
  };

  return { receive, reply };
}
