import {
  CompletionItem,
  TextDocumentPositionParams,
} from 'vscode-languageserver-protocol/node'
import { getPredefinedCompletionItems, symbolInfoToCompletionItem } from '../completion'
import { DependencyMap } from '../dependencies'
import { SymbolsByUri } from '../interfaces'

export function getCompletionHandler(symbols: SymbolsByUri, dependencies: DependencyMap) {
  return function handleCompletion(params: TextDocumentPositionParams): CompletionItem[] {
    const allDeps = dependencies.getAllBreadthFirst(params.textDocument.uri)
    const allSymbols = [...allDeps]
      .filter((uri) => symbols[uri])
      .flatMap((uri) => [...symbols[uri].values()].flat())

    return allSymbols
      .map(symbolInfoToCompletionItem)
      .concat(getPredefinedCompletionItems())
  }
}
