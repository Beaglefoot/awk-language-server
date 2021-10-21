import { DocumentSymbolParams, SymbolInformation } from 'vscode-languageserver/node'
import { SymbolsByUri } from '../interfaces'

export function getDocumentSymbolHandler(symbols: SymbolsByUri) {
  return function handleDocumentSymbol(
    params: DocumentSymbolParams,
  ): SymbolInformation[] {
    return [...symbols[params.textDocument.uri].values()].flat()
  }
}
