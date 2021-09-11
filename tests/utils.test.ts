import { getQueriesList } from '../server/src/utils'

function normalizeSpace(str: string): string {
  return str
    .replace(/ {2,}/g, ' ')
    .replace(/([\[(]) /g, (_, p1) => p1)
    .replace(/ ([\])])/g, (_, p1) => p1)
}

describe('getQueriesList function', () => {
  it('Should split multiple queries from a string into list', () => {
    const result = getQueriesList(`
      (func_def name: (identifier) @function)
      (func_call name: (identifier) @function)
    `)

    expect(result).toEqual([
      '(func_def name: (identifier) @function)',
      '(func_call name: (identifier) @function)',
    ])
  })

  it('Should not add comments to resulting list', () => {
    const result = getQueriesList(`
      (func_def name: (identifier) ; Here goes comment
      @function)
    `)

    expect(result.map(normalizeSpace)).toEqual([
      '(func_def name: (identifier) @function)',
    ])
  })

  it('Should respect open brackets', () => {
    const result = getQueriesList(`
      [
        "function"
        "print"
      ] @keyword
    `)

    expect(result.map(normalizeSpace)).toEqual(['["function" "print"] @keyword'])
  })

  it('Should prioritize quotes over comments, parens, etc.', () => {
    const result = getQueriesList(`
      [
        ";"
        "("
        "["
      ] @punctuation
    `)

    expect(result.map(normalizeSpace)).toEqual(['[";" "(" "["] @punctuation'])
  })
})
