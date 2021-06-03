import { retryWrapper } from '../src/common';

class Retrier {
  constructor(public retryCount = 0) {
    //
  }

  async success(value: number) {
    return Promise.resolve(value);
  }

  async error() {
    throw Error('should not retry');
  }

  async do(value: number): Promise<number> {
    this.retryCount++;
    if (this.retryCount === 2) {
      return Promise.resolve(value);
    }

    throw Error('test');
  }
}

describe('#retryWrapper', () => {
  it('should return res when func return success or retry success', async () => {
    const retrier = new Retrier(0);

    const res1 = await retryWrapper(() => retrier.success(1));
    expect(res1).toBe(1);

    const res2 = await retryWrapper(() => retrier.do(2));
    expect(res2).toBe(2);
  });

  it('should throw error when retry fail', async () => {
    const retrier = new Retrier(2);

    try {
      await retryWrapper(() => retrier.do(2));
    } catch (error) {
      expect(error.message).toBe('test');
    }
    expect(retrier.retryCount).toBe(5);
  });

  it('should throw error when bail', async () => {
    const retrier = new Retrier(0);
    let retryCount = 0;
    try {
      await retryWrapper(async bail => {
        try {
          await retrier.error();
        } catch (error) {
          bail(error);
          return;
        }

        retryCount++;
      });
    } catch (error) {
      expect(error.message).toBe('should not retry');
    }

    expect(retryCount).toBe(0);
  });
});
