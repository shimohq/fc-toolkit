import * as bufferSupport from './bufferSupport/invoke';

// same old interface for backwards compatibility

export type IInitInvokerOptions = Pick<
  bufferSupport.IInitInvokerOptions,
  'fc' | 'oss' | 'aws' | 'ossThreshold' | 'noOSS'
>;

export type initInvokerResult = (
  serviceName: string,
  functionName: string,
  body: any
) => Promise<string>;

export function initInvoker(options: IInitInvokerOptions): initInvokerResult {
  const invoke = bufferSupport.initInvoker({
    ...options,
    bufferOssResp: false,
  });
  return (serviceName: string, functionName: string, body: any) =>
    invoke(serviceName, functionName, body).then(res => res.toString());
}
