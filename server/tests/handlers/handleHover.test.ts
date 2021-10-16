import {
  MessageConnection,
  SymbolInformation,
  SymbolKind,
  Position,
  HoverParams,
  HoverRequest,
  MarkupContent,
} from 'vscode-languageserver-protocol'
import { getConnections, getRange } from '../helpers'
import { SymbolsByUri, TreesByUri } from '../../src/interfaces'
import { getHoverHandler } from '../../src/handlers/handleHover'
import { initializeParser } from '../../src/parser'
import { DependencyMap } from '../../src/dependencies'
import { getDocumentation } from '../../src/documentation'
import * as Parser from 'web-tree-sitter'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('handleHover', () => {
  let server: MessageConnection
  let client: MessageConnection
  let parser: Parser
  const trees: TreesByUri = {}
  const symbols: SymbolsByUri = {}
  const dependencies = new DependencyMap()
  const docs = getDocumentation()
  let uriA: string
  let uriB: string

  beforeAll(async () => {
    parser = await initializeParser()
    const connections = getConnections()

    server = connections.server
    client = connections.client

    const contentA = readFileSync(
      join('server', 'tests', 'handlers', 'fixtures', 'hover_a.awk'),
      'utf8',
    )
    const contentB = readFileSync(
      join('server', 'tests', 'handlers', 'fixtures', 'hover_b.awk'),
      'utf8',
    )
    uriA = 'file:///a.awk'
    uriB = 'file:///b.awk'

    trees[uriA] = parser.parse(contentA)
    trees[uriB] = parser.parse(contentB)

    dependencies.update(uriA, new Set([uriB]))

    symbols[uriA] = new Map()
    symbols[uriB] = new Map()

    symbols[uriA].set('f', [
      SymbolInformation.create('f', SymbolKind.Function, getRange(2, 0, 2, 16), uriA),
    ])

    symbols[uriA].set('str', [
      SymbolInformation.create('str', SymbolKind.Variable, getRange(5, 4, 5, 26), uriA),
    ])

    symbols[uriB].set('sum', [
      SymbolInformation.create('sum', SymbolKind.Function, getRange(1, 0, 3, 1), uriB),
    ])

    symbols[uriB].set('var_b', [
      SymbolInformation.create('var_b', SymbolKind.Function, getRange(6, 4, 6, 14), uriB),
    ])
  })

  it('should provide hint for builtin functions', async () => {
    // Arrange
    const sentParams: HoverParams = {
      textDocument: { uri: uriA },
      position: Position.create(5, 10),
    }

    server.onRequest(
      HoverRequest.type,
      getHoverHandler(trees, symbols, dependencies, docs),
    )

    // Act
    const result = await client.sendRequest(HoverRequest.type, sentParams)

    // Assert
    const { value } = result?.contents as MarkupContent

    expect(value).toMatch('tolower')
    expect(value).toMatch(docs.functions['tolower(str)'])
  })

  it('should provide hint for builtin array members', async () => {
    // Arrange
    const sentParams: HoverParams = {
      textDocument: { uri: uriA },
      position: Position.create(8, 14),
    }

    server.onRequest(
      HoverRequest.type,
      getHoverHandler(trees, symbols, dependencies, docs),
    )

    // Act
    const result = await client.sendRequest(HoverRequest.type, sentParams)

    // Assert
    const { value } = result?.contents as MarkupContent

    expect(value).toMatch('PROCINFO["api_major"]')
    expect(value).toMatch(docs.builtins['PROCINFO["api_major"]'])
  })

  it('should provide hint for function defined in the same document', async () => {
    // Arrange
    const sentParams: HoverParams = {
      textDocument: { uri: uriA },
      position: Position.create(6, 10),
    }

    server.onRequest(
      HoverRequest.type,
      getHoverHandler(trees, symbols, dependencies, docs),
    )

    // Act
    const result = await client.sendRequest(HoverRequest.type, sentParams)

    // Assert
    const { value } = result?.contents as MarkupContent

    expect(value).toMatch('f(a)')
  })

  it('should provide hint for function defined in included document', async () => {
    // Arrange
    const sentParams: HoverParams = {
      textDocument: { uri: uriA },
      position: Position.create(6, 15),
    }

    server.onRequest(
      HoverRequest.type,
      getHoverHandler(trees, symbols, dependencies, docs),
    )

    // Act
    const result = await client.sendRequest(HoverRequest.type, sentParams)

    // Assert
    const { value } = result?.contents as MarkupContent

    expect(value).toMatch('sum(a, b)')
  })

  it('should provide hint with comments preceding the function', async () => {
    // Arrange
    const sentParams: HoverParams = {
      textDocument: { uri: uriA },
      position: Position.create(6, 15),
    }

    server.onRequest(
      HoverRequest.type,
      getHoverHandler(trees, symbols, dependencies, docs),
    )

    // Act
    const result = await client.sendRequest(HoverRequest.type, sentParams)

    // Assert
    const { value } = result?.contents as MarkupContent

    expect(value).toMatch('Sums two numbers')
  })

  it('should provide hint for variable defined in the same document', async () => {
    // Arrange
    const sentParams: HoverParams = {
      textDocument: { uri: uriA },
      position: Position.create(7, 10),
    }

    server.onRequest(
      HoverRequest.type,
      getHoverHandler(trees, symbols, dependencies, docs),
    )

    // Act
    const result = await client.sendRequest(HoverRequest.type, sentParams)

    // Assert
    const { value } = result?.contents as MarkupContent

    expect(value).toMatch('str = tolower("Hello")')
  })

  it('should provide hint for variable defined in included document', async () => {
    // Arrange
    const sentParams: HoverParams = {
      textDocument: { uri: uriA },
      position: Position.create(7, 15),
    }

    server.onRequest(
      HoverRequest.type,
      getHoverHandler(trees, symbols, dependencies, docs),
    )

    // Act
    const result = await client.sendRequest(HoverRequest.type, sentParams)

    // Assert
    const { value } = result?.contents as MarkupContent

    expect(value).toMatch('var_b = 42')
  })
})
