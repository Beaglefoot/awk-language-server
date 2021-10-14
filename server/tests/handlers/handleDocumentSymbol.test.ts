import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node'
import {
  createMessageConnection,
  DocumentSymbolRequest,
  MessageConnection,
  SymbolInformation,
  SymbolKind,
  Range,
  Position,
} from 'vscode-languageserver-protocol'
import { DocumentSymbolParams } from 'vscode-languageserver-protocol/node'
import { NullLogger, TestStream } from '../helpers'
import { SymbolsByUri, SymbolsMap } from '../../src/interfaces'
import { getDocumentSymbolHandler } from '../../src/handlers/handleDocumentSymbol'

describe('DocumentSymbol request handler ', () => {
  let serverConnection: MessageConnection
  let clientConnection: MessageConnection

  beforeAll(() => {
    const up = new TestStream()
    const down = new TestStream()
    const logger = new NullLogger()

    clientConnection = createMessageConnection(
      new StreamMessageReader(down),
      new StreamMessageWriter(up),
      logger,
    )

    serverConnection = createMessageConnection(
      new StreamMessageReader(up),
      new StreamMessageWriter(down),
      logger,
    )

    clientConnection.listen()
    serverConnection.listen()
  })

  test('handleDocumentSymbol', async () => {
    // Arrange
    const uri = 'file:///my_file.awk'
    const symbolsMap: SymbolsMap = new Map()
    const symbolInfo = SymbolInformation.create(
      'myFunc',
      SymbolKind.Function,
      Range.create(Position.create(0, 0), Position.create(3, 1)),
    )

    symbolsMap.set('myFunc', [symbolInfo])

    const symbols: SymbolsByUri = { [uri]: symbolsMap }
    const sentParams: DocumentSymbolParams = {
      textDocument: { uri },
    }

    serverConnection.onRequest(
      DocumentSymbolRequest.type,
      getDocumentSymbolHandler(symbols),
    )

    // Act
    const result = await clientConnection.sendRequest(
      DocumentSymbolRequest.type,
      sentParams,
    )

    // Assert
    expect(result).toEqual([symbolInfo])
  })
})
