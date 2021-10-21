import { DefinitionParams, Location } from 'vscode-languageserver-protocol/node'
import { DependencyMap } from '../dependencies'
import { SymbolsByUri, TreesByUri } from '../interfaces'
import { getName, getNodeAt } from '../utils'

export function getDefinitionHandler(
  trees: TreesByUri,
  symbols: SymbolsByUri,
  dependencies: DependencyMap,
) {
  return function handleDefinition(params: DefinitionParams): Location[] {
    const { textDocument, position } = params
    const node = getNodeAt(trees[textDocument.uri], position.line, position.character)

    if (!node) return []

    const name = getName(node)

    if (!name) return []

    return Object.keys(symbols)
      .filter(
        (uri) =>
          symbols[uri].get(name) &&
          (uri === textDocument.uri || dependencies.hasParent(uri, textDocument.uri)),
      )
      .flatMap((uri) => (symbols[uri].get(name) || []).map((s) => s.location))
  }
}
