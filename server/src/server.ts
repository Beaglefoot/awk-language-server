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
} from 'vscode-languageserver/node'

import { TextDocument } from 'vscode-languageserver-textdocument'
import { Context } from './context'
import { initializeParser } from './parser'
import { validateTextDocument } from './validateTextDocument'

let context: Context

const connection = createConnection(ProposedFeatures.all)
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

function registerHandlers() {
  connection.onInitialize(handleInitialize)
  documents.onDidChangeContent(handleDidChangeContent)
  connection.onCompletion(handleCompletion)
  connection.onCompletionResolve(handleCompletionResolve)
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
    },
  }

  return result
}

function handleDidChangeContent(change: TextDocumentChangeEvent<TextDocument>) {
  validateTextDocument(context, change.document)
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

function main() {
  registerHandlers()

  documents.listen(connection)
  connection.listen()
}

main()
