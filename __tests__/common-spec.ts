import { retryWrapper } from '../src/common';

describe('#retryWrapper', () => {
  beforeAll(() => {
    this.successFunc = async (value) => Promise.resolve(value)

    this.retryCount = 0
    this.retryFunc = async (value) => {
      this.retryCount++
      if (this.retryCount === 2) {
        return Promise.resolve(value)
      }

      throw Error('test')
    }

    this.errorFunc = async () => {
      throw Error('should not retry')
    }
  })

  it('should return res when func return success or retry success', async () => {
    const res1 = await retryWrapper(() => this.successFunc(1))
    expect(res1).toBe(1)

    const res2 = await retryWrapper(() => this.retryFunc(2))
    expect(res2).toBe(2)
  })

  it('should throw error when retry fail', async () => {
    this.retryCount = 2

    try {
      await retryWrapper(() => this.retryFunc(2))
    } catch (error) {
      expect(error.message).toBe('test')
    }
    expect(this.retryCount).toBe(5)
  })

  it('should throw error when bail', async () => {
    let retryCount = 0
    try {
      await retryWrapper(async (bail) => {
        try {
          await this.errorFunc()
        } catch (error) {
          bail(error)
          return
        }

        retryCount++
      })
    } catch (error) {
      expect(error.message).toBe('should not retry')
    }

    expect(retryCount).toBe(0)
  })
})
