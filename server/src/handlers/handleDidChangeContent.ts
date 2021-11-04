import { TextDocument } from 'vscode-languageserver-textdocument'
import { TextDocumentChangeEvent } from 'vscode-languageserver/node'
import { analyze } from '../analyze'
import { DependencyMap } from '../dependencies'
import { Documentation } from '../documentation'
import { Context, SymbolsByUri, TreesByUri } from '../interfaces'
import { validate } from '../validate'

export function getDidChangeContentHandler(
  context: Context,
  trees: TreesByUri,
  symbols: SymbolsByUri,
  dependencies: DependencyMap,
  docs: Documentation,
) {
  return function handleDidChangeContent(
    change: TextDocumentChangeEvent<TextDocument>,
  ): void {
    const results = analyze(context, change.document, docs)
    const diagnostics = validate(results.tree)

    trees[change.document.uri] = results.tree
    symbols[change.document.uri] = results.symbols

    dependencies.update(change.document.uri, new Set(results.dependencyUris))

    context.connection.sendDiagnostics({ uri: change.document.uri, diagnostics })
  }
}
