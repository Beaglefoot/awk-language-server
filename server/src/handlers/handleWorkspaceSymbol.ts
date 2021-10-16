import { SymbolInformation, WorkspaceSymbolParams } from 'vscode-languageserver/node'
import { SymbolsByUri } from '../interfaces'

export function getWorkspaceSymbolHandler(symbols: SymbolsByUri) {
  return function handleWorkspaceSymbol(
    params: WorkspaceSymbolParams,
  ): SymbolInformation[] {
    const result: SymbolInformation[] = []
    const symbolBuckets = Object.values(symbols)

    for (const sb of symbolBuckets) {
      const matchedNames: string[] = []

      for (const name of sb.keys()) {
        if (name.includes(params.query)) matchedNames.push(name)
      }

      result.push(...matchedNames.flatMap((n) => sb.get(n) || []))
    }

    return result
  }
}
