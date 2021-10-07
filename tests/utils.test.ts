import { getFunctionSignature, getQueriesList } from '../server/src/utils'
import { initializeParser } from '../server/src/parser'
import * as Parser from 'web-tree-sitter'

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

describe('getFunctionSignature function', () => {
  let parser: Parser

  beforeAll(async () => {
    parser = await initializeParser()
  })

  it('Should work for params in one line', () => {
    const tree = parser.parse('function f(a, b) {}')
    const functionDefinitionNode = tree.rootNode.descendantsOfType('func_def')[0]

    expect(getFunctionSignature(functionDefinitionNode)).toEqual('f(a, b)')
  })

  it('Should work for params in multiple lines', () => {
    const tree = parser.parse(`
    function f(
      a,
      b
    ) {}
    `)
    const functionDefinitionNode = tree.rootNode.descendantsOfType('func_def')[0]
    console.log(functionDefinitionNode.text)

    expect(getFunctionSignature(functionDefinitionNode)).toEqual('f(a, b)')
  })

  it('Should handle comments in params', () => {
    const tree = parser.parse(`
    function f(a,
      # comment
      b
    ) {}
    `)
    const functionDefinitionNode = tree.rootNode.descendantsOfType('func_def')[0]

    expect(getFunctionSignature(functionDefinitionNode)).toEqual('f(a, b)')
  })
})
