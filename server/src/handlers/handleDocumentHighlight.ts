import {
  DocumentHighlight,
  DocumentHighlightParams,
} from 'vscode-languageserver-protocol/node'
import { Context } from '../interfaces'
import { findReferences, getName, getNodeAt } from '../utils'

export function getDocumentHighlightHandler(context: Context) {
  const { trees } = context

  return function handleDocumentHighlight(
    params: DocumentHighlightParams,
  ): DocumentHighlight[] {
    const { textDocument, position } = params

    let node = getNodeAt(trees[textDocument.uri], position.line, position.character)

    if (!node) return []

    if (node.type === 'number' && node.parent?.type === 'field_ref') {
      node = node.parent
    }

    const queriedName = getName(node)

    if (!queriedName) return []

    const tree = trees[textDocument.uri]

    return findReferences(tree, queriedName).map((range) =>
      DocumentHighlight.create(range),
    )
  }
}
