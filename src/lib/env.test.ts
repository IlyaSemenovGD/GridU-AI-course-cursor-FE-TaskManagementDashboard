import { describe, expect, it } from 'vitest'

import { API_BASE_URL } from './env'

describe('env', () => {
  it('resolves a default API base URL', () => {
    expect(API_BASE_URL).toMatch(/127\.0\.0\.1:5000$/)
  })
})
