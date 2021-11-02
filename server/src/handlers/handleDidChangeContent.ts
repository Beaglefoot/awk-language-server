import { TextDocument } from 'vscode-languageserver-textdocument'
import { TextDocumentChangeEvent } from 'vscode-languageserver/node'
import { analyze } from '../analyze'
import { DependencyMap } from '../dependencies'
import { Context, SymbolsByUri, TreesByUri } from '../interfaces'
import { validate } from '../validate'

export function getDidChangeContentHandler(
  context: Context,
  trees: TreesByUri,
  symbols: SymbolsByUri,
  dependencies: DependencyMap,
) {
  return function handleDidChangeContent(
    change: TextDocumentChangeEvent<TextDocument>,
  ): void {
    const results = analyze(context, change.document)
    const diagnostics = validate(results.tree)

    trees[change.document.uri] = results.tree
    symbols[change.document.uri] = results.symbols

    dependencies.update(change.document.uri, new Set(results.dependencyUris))

    context.connection.sendDiagnostics({ uri: change.document.uri, diagnostics })
  }
}
