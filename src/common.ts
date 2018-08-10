export function sizeof(str: string): number {
  return Buffer.byteLength(str, 'utf-8');
}

export function getFunctionName({ name, version }: any): string {
  if (name.indexOf('/') > -1) {
    name = name.split('/')[1];
  }

  return `${name}-${version.replace(/\./g, '_')}`;
}
