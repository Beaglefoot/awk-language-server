import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  ClientCapabilities,
  Connection,
  SymbolInformation,
  TextDocuments,
} from 'vscode-languageserver/node'
import { Tree } from 'web-tree-sitter'
import Parser = require('web-tree-sitter')

type SymbolName = string

// Value is array because symbol with the same name can be defined globally and as a function parameter
export type SymbolsMap = Map<SymbolName, SymbolInformation[]>

export interface SymbolsByUri {
  [uri: string]: SymbolsMap
}

export interface TreesByUri {
  [uri: string]: Tree
}

export interface Context {
  connection: Connection
  documents: TextDocuments<TextDocument>
  capabilities: ClientCapabilities
  parser: Parser
}
