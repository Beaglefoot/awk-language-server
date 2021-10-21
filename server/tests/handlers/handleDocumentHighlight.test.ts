import {
  MessageConnection,
  Position,
  DocumentHighlightParams,
  DocumentHighlightRequest,
  DocumentHighlight,
} from 'vscode-languageserver-protocol'
import { getConnections, getRange } from '../helpers'
import { TreesByUri } from '../../src/interfaces'
import { getDocumentHighlightHandler } from '../../src/handlers/handleDocumentHighlight'
import { initializeParser } from '../../src/parser'
import * as Parser from 'web-tree-sitter'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('handleDocumentHighlight', () => {
  let server: MessageConnection
  let client: MessageConnection
  let parser: Parser
  const trees: TreesByUri = {}
  let uri: string

  beforeAll(async () => {
    parser = await initializeParser()
    const connections = getConnections()

    server = connections.server
    client = connections.client

    const content = readFileSync(
      join('server', 'tests', 'handlers', 'fixtures', 'document_highlight.awk'),
      'utf8',
    )
    uri = 'file:///a.awk'

    trees[uri] = parser.parse(content)
  })

  it('should provide symbol highlights in document', async () => {
    // Arrange
    const sentParams: DocumentHighlightParams = {
      textDocument: { uri: uri },
      position: Position.create(5, 4),
    }

    server.onRequest(DocumentHighlightRequest.type, getDocumentHighlightHandler(trees))

    // Act
    const result = await client.sendRequest(DocumentHighlightRequest.type, sentParams)

    // Assert
    expect(result).toEqual([
      DocumentHighlight.create(getRange(0, 9, 0, 10)),
      DocumentHighlight.create(getRange(5, 4, 5, 5)),
    ])
  })

  it('should provide field reference highlights in document', async () => {
    // Arrange
    const sentParams: DocumentHighlightParams = {
      textDocument: { uri: uri },
      position: Position.create(1, 11),
    }

    server.onRequest(DocumentHighlightRequest.type, getDocumentHighlightHandler(trees))

    // Act
    const result = await client.sendRequest(DocumentHighlightRequest.type, sentParams)

    // Assert
    expect(result).toEqual([
      DocumentHighlight.create(getRange(1, 10, 1, 12)),
      DocumentHighlight.create(getRange(6, 4, 6, 6)),
    ])
  })
})
