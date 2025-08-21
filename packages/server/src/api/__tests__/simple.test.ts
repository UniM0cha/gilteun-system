import { describe, it, expect } from 'vitest'

describe('Server Basic Tests', () => {
  it('basic test works', () => {
    expect(1 + 1).toBe(2)
  })

  it('environment is test', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })
})