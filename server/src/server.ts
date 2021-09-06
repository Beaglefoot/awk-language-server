import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  TextDocumentChangeEvent,
  DefinitionParams,
  Location,
  Range,
} from 'vscode-languageserver/node'

import { TextDocument } from 'vscode-languageserver-textdocument'
import { Context } from './context'
import { initializeParser } from './parser'
import { validate } from './validate'
import { analyze, Symbols } from './analyze'
import { Tree } from 'web-tree-sitter'
import { getNodeAt, getWordAt } from './utils'

let context: Context

const connection = createConnection(ProposedFeatures.all)
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)
const trees: { [uri: string]: Tree } = {}
const symbols: { [uri: string]: Symbols } = {}

function registerHandlers() {
  connection.onInitialize(handleInitialize)
  documents.onDidChangeContent(handleDidChangeContent)
  connection.onCompletion(handleCompletion)
  connection.onCompletionResolve(handleCompletionResolve)
  connection.onDefinition(handleDefinition)
}

async function handleInitialize(params: InitializeParams): Promise<InitializeResult> {
  const parser = await initializeParser()

  context = { connection, documents, capabilities: params.capabilities, parser }

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
      },
      definitionProvider: true,
    },
  }

  return result
}

function handleDidChangeContent(change: TextDocumentChangeEvent<TextDocument>) {
  const { tree, symbols: documentSymbols } = analyze(context, change.document)
  const diagnostics = validate(tree)

  trees[change.document.uri] = tree
  symbols[change.document.uri] = documentSymbols

  context.connection.sendDiagnostics({ uri: change.document.uri, diagnostics })
}

function handleCompletion(
  _textDocumentPosition: TextDocumentPositionParams,
): CompletionItem[] {
  return [
    {
      label: 'BEGIN',
      kind: CompletionItemKind.Keyword,
      data: 1,
    },
    {
      label: 'END',
      kind: CompletionItemKind.Keyword,
      data: 2,
    },
  ]
}

function handleCompletionResolve(item: CompletionItem): CompletionItem {
  if (item.data === 1) {
    item.detail = 'BEGIN'
    item.documentation =
      'BEGIN is a special kind of pattern which is executed before any of the input is read.'
  } else if (item.data === 2) {
    item.detail = 'END'
    item.documentation =
      'END is a special kind of pattern which is executed after all the input is exhausted (or on  exit  statement).'
  }
  return item
}

function handleDefinition(params: DefinitionParams): Location[] {
  const { textDocument, position } = params
  const node = getNodeAt(trees[textDocument.uri], position.line, position.character)

  if (!node) return []

  const name = getWordAt(node)

  if (!name) return []

  return Object.keys(symbols)
    .filter((uri) => symbols[uri][name])
    .flatMap((uri) => symbols[uri][name].map((s) => s.location))
}

function main() {
  registerHandlers()

  documents.listen(connection)
  connection.listen()
}

main()
