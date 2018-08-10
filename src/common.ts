export function sizeof(str: string): number {
  return Buffer.byteLength(str, 'utf-8')
}
