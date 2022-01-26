import {
  RenameParams,
  TextEdit,
  WorkspaceEdit,
} from 'vscode-languageserver-protocol/node'
import { Context } from '../interfaces'
import {
  findReferences,
  getName,
  getNodeAt,
  getParentFunction,
  isIdentifier,
} from '../utils'

export function getRenameRequestHandler(context: Context) {
  const { trees, dependencies } = context

  return async function handleRenameRequest(
    params: RenameParams,
  ): Promise<WorkspaceEdit | null> {
    const { position, textDocument, newName } = params
    const node = getNodeAt(trees[textDocument.uri], position.line, position.character)

    if (!node || !isIdentifier(node)) return null

    const oldName = getName(node)

    if (!oldName) return null

    const parentFunction = getParentFunction(node)

    // Parameter rename
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

    // Function and variable rename
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
}
