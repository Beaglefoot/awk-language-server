import { TextDocument } from 'vscode-languageserver-textdocument'
import { TextDocumentChangeEvent } from 'vscode-languageserver/node'
import { analyze } from '../analyze'
import { DependencyMap } from '../dependencies'
import { Context, SymbolsByUri, TreesByUri } from '../interfaces'

export function getDidOpenHandler(
  context: Context,
  trees: TreesByUri,
  symbols: SymbolsByUri,
  dependencies: DependencyMap,
) {
  return function handleDidOpen(change: TextDocumentChangeEvent<TextDocument>) {
    const results = analyze(context, change.document, true)

    for (const { tree, symbols: documentSymbols, document, dependencyUris } of results) {
      trees[document.uri] = tree
      symbols[document.uri] = documentSymbols
      dependencies.update(document.uri, new Set(dependencyUris))
    }
  }
}
