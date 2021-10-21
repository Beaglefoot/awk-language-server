import {
  MessageConnection,
  SymbolInformation,
  SymbolKind,
  Range,
  Position,
  WorkspaceSymbolParams,
  WorkspaceSymbolRequest,
} from 'vscode-languageserver-protocol'
import { getConnections, getRange } from '../helpers'
import { SymbolsByUri, SymbolsMap } from '../../src/interfaces'
import { getWorkspaceSymbolHandler } from '../../src/handlers/handleWorkspaceSymbol'

describe('handleWorkspaceSymbol', () => {
  const symbols: SymbolsByUri = {}
  let server: MessageConnection
  let client: MessageConnection
  let uriA: string
  let uriB: string
  let symbolA: SymbolInformation
  let symbolB: SymbolInformation

  beforeAll(() => {
    const connections = getConnections()
    server = connections.server
    client = connections.client

    uriA = 'file:///a.awk'
    uriB = 'file:///b.awk'

    symbols[uriA] = new Map()
    symbols[uriB] = new Map()

    symbolA = SymbolInformation.create(
      'func_a',
      SymbolKind.Function,
      getRange(0, 0, 1, 1),
      uriA,
    )

    symbolB = SymbolInformation.create(
      'func_b',
      SymbolKind.Function,
      getRange(0, 0, 1, 1),
      uriB,
    )

    symbols[uriA].set('func_a', [symbolA])
    symbols[uriB].set('func_b', [symbolB])
  })

  it('should provide list of symbols for entire workspace', async () => {
    // Arrange
    const sentParams: WorkspaceSymbolParams = {
      query: 'func',
    }

    server.onRequest(WorkspaceSymbolRequest.type, getWorkspaceSymbolHandler(symbols))

    // Act
    const result = await client.sendRequest(WorkspaceSymbolRequest.type, sentParams)

    // Assert
    expect(result).toEqual([symbolA, symbolB])
  })
})
