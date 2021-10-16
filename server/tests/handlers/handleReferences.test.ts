import {
  MessageConnection,
  Position,
  Location,
  ReferenceParams,
  ReferencesRequest,
} from 'vscode-languageserver-protocol'
import { getConnections, getRange } from '../helpers'
import { TreesByUri } from '../../src/interfaces'
import { getReferencesHandler } from '../../src/handlers/handleReferences'
import { initializeParser } from '../../src/parser'
import { DependencyMap } from '../../src/dependencies'
import * as Parser from 'web-tree-sitter'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('handleReferences', () => {
  let server: MessageConnection
  let client: MessageConnection
  let parser: Parser
  const trees: TreesByUri = {}
  const dependencies = new DependencyMap()
  let uriA: string
  let uriB: string

  beforeAll(async () => {
    parser = await initializeParser()
    const connections = getConnections()

    server = connections.server
    client = connections.client

    const contentA = readFileSync(
      join('server', 'tests', 'handlers', 'fixtures', 'references_a.awk'),
      'utf8',
    )
    const contentB = readFileSync(
      join('server', 'tests', 'handlers', 'fixtures', 'references_b.awk'),
      'utf8',
    )
    uriA = 'file:///a.awk'
    uriB = 'file:///b.awk'

    trees[uriA] = parser.parse(contentA)
    trees[uriB] = parser.parse(contentB)

    dependencies.update(uriA, new Set([uriB]))
  })

  it('should provide referenced locations for same file symbols', async () => {
    // Arrange
    const sentParams: ReferenceParams = {
      context: { includeDeclaration: true },
      textDocument: { uri: uriA },
      position: Position.create(4, 2),
    }

    server.onRequest(ReferencesRequest.type, getReferencesHandler(trees, dependencies))

    // Act
    const result = await client.sendRequest(ReferencesRequest.type, sentParams)

    // Assert
    expect(result).toContainEqual(Location.create(uriA, getRange(2, 9, 2, 10)))
    expect(result).toContainEqual(Location.create(uriA, getRange(4, 2, 4, 3)))
  })

  it('should provide referenced locations for symbols in included documents', async () => {
    // Arrange
    const sentParams: ReferenceParams = {
      context: { includeDeclaration: true },
      textDocument: { uri: uriA },
      position: Position.create(4, 8),
    }

    server.onRequest(ReferencesRequest.type, getReferencesHandler(trees, dependencies))

    // Act
    const result = await client.sendRequest(ReferencesRequest.type, sentParams)

    // Assert
    expect(result).toContainEqual(Location.create(uriA, getRange(4, 8, 4, 11)))
    expect(result).toContainEqual(Location.create(uriB, getRange(0, 9, 0, 12)))
  })

  it('should provide referenced locations for symbols in parent documents', async () => {
    // Arrange
    const sentParams: ReferenceParams = {
      context: { includeDeclaration: true },
      textDocument: { uri: uriB },
      position: Position.create(0, 9),
    }

    server.onRequest(ReferencesRequest.type, getReferencesHandler(trees, dependencies))

    // Act
    const result = await client.sendRequest(ReferencesRequest.type, sentParams)

    // Assert
    expect(result).toContainEqual(Location.create(uriA, getRange(4, 8, 4, 11)))
    expect(result).toContainEqual(Location.create(uriB, getRange(0, 9, 0, 12)))
  })
})
