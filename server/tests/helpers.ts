import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node'
import {
  createMessageConnection,
  MessageConnection,
  Position,
} from 'vscode-languageserver-protocol'
import { Duplex } from 'stream'
import { Logger, TextDocuments } from 'vscode-languageserver/node'
import { Context } from '../src/interfaces'
import { TextDocument } from 'vscode-languageserver-textdocument'
import * as Parser from 'web-tree-sitter'
import { Range } from 'vscode-languageserver/node'

export class NullLogger implements Logger {
  error(_message: string): void {}
  warn(_message: string): void {}
  info(_message: string): void {}
  log(_message: string): void {}
}

export class TestStream extends Duplex {
  _write(chunk: string, _encoding: string, done: () => void) {
    this.emit('data', chunk)
    done()
  }

  _read(_size: number) {}
}

export function getConnections(): {
  client: MessageConnection
  server: MessageConnection
} {
  const up = new TestStream()
  const down = new TestStream()
  const logger = new NullLogger()

  const client = createMessageConnection(
    new StreamMessageReader(down),
    new StreamMessageWriter(up),
    logger,
  )

  const server = createMessageConnection(
    new StreamMessageReader(up),
    new StreamMessageWriter(down),
    logger,
  )

  client.listen()
  server.listen()

  return { client, server }
}

export function getDummyContext(server: MessageConnection, parser: Parser): Context {
  const missingConnectionProperties = {
    console: { log: jest.fn() },
    sendDiagnostics: jest.fn(),
  }
  const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

  return {
    connection: { ...server, ...missingConnectionProperties } as any,
    documents,
    capabilities: {},
    parser,
  }
}

export function getRange(
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number,
): Range {
  return Range.create(
    Position.create(startLine, startCharacter),
    Position.create(endLine, endCharacter),
  )
}
