import {
  CompletionItem,
  TextDocumentPositionParams,
} from 'vscode-languageserver-protocol/node'
import { getPredefinedCompletionItems, symbolInfoToCompletionItem } from '../completion'
import { Context } from '../interfaces'

export function getCompletionHandler(context: Context) {
  const { symbols, dependencies } = context

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
