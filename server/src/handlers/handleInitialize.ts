import { FileOperationFilter } from 'vscode-languageserver-protocol/lib/common/protocol.fileOperations'
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

// Cannot use matches with file types until new release
// https://github.com/microsoft/vscode-languageserver-node/issues/734
const fileOperationFilter: FileOperationFilter = {
  pattern: {
    glob: '**/*.{awk,gawk}',
    options: { ignoreCase: true },
  },
}

const folderOperationFilter: FileOperationFilter = {
  pattern: {
    glob: '**/*',
  },
}

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
        documentFormattingProvider: true,
        workspace: {
          fileOperations: {
            didDelete: {
              filters: [fileOperationFilter],
            },
            didCreate: {
              filters: [fileOperationFilter],
            },
            didRename: {
              filters: [fileOperationFilter, folderOperationFilter],
            },
          },
        },
      },
    }

    progressReporter.done()

    return result
  }
}
