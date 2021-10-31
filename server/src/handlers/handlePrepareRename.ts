import { Connection } from 'vscode-languageserver'
import { PrepareRenameParams, Range } from 'vscode-languageserver-protocol/node'
import { Documentation } from '../documentation'
import { getBuiltinHints } from '../hints'
import { TreesByUri } from '../interfaces'
import { getName, getNodeAt, isIdentifier, pointToPosition } from '../utils'

export function getPrepareRenameHandler(
  trees: TreesByUri,
  connection: Connection,
  docs: Documentation,
) {
  return function handlePrepareRename(params: PrepareRenameParams): Range | null {
    const { position, textDocument } = params
    const node = getNodeAt(trees[textDocument.uri], position.line, position.character)

    if (!node || !isIdentifier(node)) return null

    const name = getName(node)

    if (!name) return null

    const builtins = getBuiltinHints(docs)

    if (builtins[name]) {
      connection.window.showErrorMessage(`'${name}' is builtin`)
      return null
    }

    return Range.create(
      pointToPosition(node.startPosition),
      pointToPosition(node.endPosition),
    )
  }
}
