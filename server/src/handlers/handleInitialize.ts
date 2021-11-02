import { TextDocument } from 'vscode-languageserver-textdocument'
import { WorkDoneProgressReporter } from 'vscode-languageserver/lib/common/progress'
import {
  CancellationToken,
  Connection,
  InitializeParams,
  InitializeResult,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node'
import { initCompletionList } from '../completion'
import { Documentation } from '../documentation'
import { Context } from '../interfaces'
import { initializeParser } from '../parser'

export function getInitializeHandler(
  context: Context,
  connection: Connection,
  documents: TextDocuments<TextDocument>,
  docs: Documentation,
) {
  return async function handleInitialize(
    params: InitializeParams,
    _cancel: CancellationToken,
    progressReporter: WorkDoneProgressReporter,
  ): Promise<InitializeResult> {
    progressReporter.begin('Initializing')

    const parser = await initializeParser()
    initCompletionList(docs)

    context.connection = connection
    context.documents = documents
    context.capabilities = params.capabilities
    context.parser = parser

    const result: InitializeResult = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
          resolveProvider: true,
        },
        definitionProvider: true,
        documentHighlightProvider: true,
        documentSymbolProvider: true,
        workspaceSymbolProvider: true,
        referencesProvider: true,
        hoverProvider: true,
        renameProvider: { prepareProvider: true },
      },
    }

    progressReporter.done()

    return result
  }
}
