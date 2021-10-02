import * as path from 'path'
import { workspace, ExtensionContext, languages, SemanticTokensLegend } from 'vscode'

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node'
import { SemanticTokensProvider, tokenTypesLegend } from './semanticTokens'

let client: LanguageClient

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(
    path.join('node_modules', 'awk-language-server', 'out', 'server.js'),
  )

  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] }

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  }

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'awk' }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
    },
  }

  client = new LanguageClient('awk-ide-vscode', 'AWK IDE', serverOptions, clientOptions)

  client.onReady().then(() => {
    context.subscriptions.push(
      languages.registerDocumentSemanticTokensProvider(
        { language: 'awk' },
        new SemanticTokensProvider(client),
        new SemanticTokensLegend(tokenTypesLegend, []),
      ),
    )
  })

  client.start()
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined
  }
  return client.stop()
}
