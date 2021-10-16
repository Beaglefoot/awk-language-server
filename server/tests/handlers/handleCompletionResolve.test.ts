import {
  MessageConnection,
  CompletionItem,
  CompletionItemKind,
  CompletionResolveRequest,
  SymbolInformation,
  SymbolKind,
} from 'vscode-languageserver-protocol'
import { getConnections, getDummyContext, getRange } from '../helpers'
import { TreesByUri } from '../../src/interfaces'
import { getCompletionResolveHandler } from '../../src/handlers/handleCompletionResolve'
import { Documentation, getDocumentation } from '../../src/documentation'
import { UserDefinedDataEntry } from '../../src/completion'
import { initializeParser } from '../../src/parser'
import * as Parser from 'web-tree-sitter'

describe('handleCompletionResolve', () => {
  let server: MessageConnection
  let client: MessageConnection
  let trees: TreesByUri = {}
  let docs: Documentation
  let parser: Parser

  beforeAll(async () => {
    parser = await initializeParser()
    const connections = getConnections()

    server = connections.server
    client = connections.client
    docs = getDocumentation()
  })

  it('should provide details for builtins', async () => {
    // Arrange
    const sentParams: CompletionItem = {
      label: 'tolower',
      kind: CompletionItemKind.Function,
      data: 'functions.tolower(str)',
    }

    server.onRequest(
      CompletionResolveRequest.type,
      getCompletionResolveHandler(trees, docs),
    )

    // Act
    const result = await client.sendRequest(CompletionResolveRequest.type, sentParams)

    // Assert
    expect(result.detail).toEqual('tolower(str)')
    expect(result.documentation).toEqual(docs.functions['tolower(str)'])
  })

  it('should provide details for user defined symbols', async () => {
    // Arrange
    const dummyFuncDefinition = 'function myFunc(a) {}'
    const uri = 'file:///my_file.awk'
    const symbolInfo = SymbolInformation.create(
      'myFunc',
      SymbolKind.Function,
      getRange(0, 0, 0, dummyFuncDefinition.length),
      uri,
    )

    trees[uri] = parser.parse(dummyFuncDefinition)

    const sentParams: CompletionItem = {
      label: 'tolower',
      kind: CompletionItemKind.Function,
      data: {
        type: 'user_defined',
        symbolInfo,
      } as UserDefinedDataEntry,
    }

    server.onRequest(
      CompletionResolveRequest.type,
      getCompletionResolveHandler(trees, docs),
    )

    // Act
    const result = await client.sendRequest(CompletionResolveRequest.type, sentParams)

    // Assert
    expect(result.detail).toEqual('myFunc(a)')
  })
})
