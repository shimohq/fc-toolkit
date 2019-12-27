const retry = require('async-retry');

export function sizeof(str: string | Buffer): number {
  return Buffer.byteLength(str, 'utf-8');
}

export function getFunctionName({ name, version }: any): string {
  if (name.indexOf('/') > -1) {
    name = name.split('/')[1];
  }

  return `${name}-${version.replace(/\./g, '_')}`;
}

export async function retryWrapper(execution: any, options: any = {}) {
  return retry(
    async (bail: any) => {
      const res = await execution(bail);
      return res;
    },
    {
      retries: options.retries || 2,
      minTimeout: options.minTimeout || 1000,
      maxTimeout: options.maxTimeout || 3000,
    }
  );
}
