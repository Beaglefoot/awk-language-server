import { DefinitionParams, Location } from 'vscode-languageserver-protocol/node'
import { Context } from '../interfaces'
import { getName, getNodeAt, getParentFunctionName } from '../utils'

export function getDefinitionHandler(context: Context) {
  const { trees, symbols, dependencies } = context

  return function handleDefinition(params: DefinitionParams): Location[] {
    const { textDocument, position } = params
    const node = getNodeAt(trees[textDocument.uri], position.line, position.character)

    if (!node) return []

    const name = getName(node)

    if (!name) return []

    return [...dependencies.getLinkedUris(textDocument.uri)]
      .filter((uri) => symbols[uri]?.has(name))
      .flatMap((uri) =>
        (symbols[uri].get(name) || [])
          .filter((s) => s.containerName === (getParentFunctionName(node) ?? undefined))
          .map((s) => s.location),
      )
  }
}
