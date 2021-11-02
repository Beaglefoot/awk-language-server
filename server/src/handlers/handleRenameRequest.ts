import {
  RenameParams,
  TextEdit,
  WorkspaceEdit,
} from 'vscode-languageserver-protocol/node'
import { DependencyMap } from '../dependencies'
import { TreesByUri } from '../interfaces'
import {
  findReferences,
  getName,
  getNodeAt,
  getParentFunction,
  isFunction,
} from '../utils'

export function getRenameRequestHandler(trees: TreesByUri, dependencies: DependencyMap) {
  return async function handleRenameRequest(
    params: RenameParams,
  ): Promise<WorkspaceEdit | null> {
    const { position, textDocument, newName } = params
    const node = getNodeAt(trees[textDocument.uri], position.line, position.character)

    if (!node) return null

    const oldName = getName(node)

    if (!oldName) return null

    if (node.parent && isFunction(node.parent)) {
      const linkedUris = dependencies.getLinkedUris(textDocument.uri)
      const edits: WorkspaceEdit = {}

      for (const uri of linkedUris) {
        if (!trees[uri]) continue
        if (!edits.changes) edits.changes = {}
        if (!edits.changes[uri]) edits.changes[uri] = []

        edits.changes[uri] = findReferences(trees[uri], oldName).map((r) =>
          TextEdit.replace(r, newName),
        )
      }

      return edits
    }

    const parentFunction = getParentFunction(node)

    if (parentFunction) {
      const edits: WorkspaceEdit = {
        changes: {
          [textDocument.uri]: [],
        },
      }

      edits.changes![textDocument.uri] = findReferences(
        trees[textDocument.uri],
        oldName,
        parentFunction,
      ).map((r) => TextEdit.replace(r, newName))

      return edits
    }

    return null
  }
}
