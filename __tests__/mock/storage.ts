export default class Storage {
  private map: Map<string, Buffer>

  constructor() {
    this.map = new Map<string, Buffer>();
  }

  public async getAsBuffer(key: string): Promise<{content: Buffer} | undefined> {
    const data = this.map.get(key);
    if (!data) {
      return undefined;
    }

    return {
      content: data
    }
  }

  public async del(key: string) {
    this.map.delete(key)
  }

  public async put(key: string, data: Buffer | string) {
    if (data instanceof Buffer) {
      this.map.set(key, data);
      return
    }

    const buffer = Buffer.from(data);
    this.map.set(key, buffer);
  }
}
