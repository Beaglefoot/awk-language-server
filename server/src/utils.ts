import { Range } from 'vscode-languageserver/node'
import { SyntaxNode, Tree } from 'web-tree-sitter'

export function* nodesGen(node: SyntaxNode) {
  const queue: SyntaxNode[] = [node]

  while (queue.length) {
    const n = queue.shift()

    if (!n) return

    if (n.children.length) {
      queue.unshift(...n.children)
    }

    yield n
  }
}

export function findParent(
  start: SyntaxNode,
  predicate: (n: SyntaxNode) => boolean,
): SyntaxNode | null {
  let node = start.parent

  while (node !== null) {
    if (predicate(node)) return node

    node = node.parent
  }

  return null
}

export function getRange(node: SyntaxNode): Range {
  return Range.create(
    node.startPosition.row,
    node.startPosition.column,
    node.endPosition.row,
    node.endPosition.column,
  )
}

export function getNodeAt(tree: Tree, line: number, column: number): SyntaxNode | null {
  if (!tree.rootNode) return null

  return tree.rootNode.descendantForPosition({ row: line, column })
}

/** Get textual representation of the node (function name, variable name, etc.) */
export function getName(node: SyntaxNode): string | null {
  if (!node || (node.childCount && node.type !== 'field_ref')) return null

  return node.text.trim() || null
}

export function isDefinition(node: SyntaxNode): boolean {
  return ['assignment_exp', 'func_def'].includes(node.type)
}

export function isReference(node: SyntaxNode): boolean {
  return ['array_ref', 'field_ref', 'identifier'].includes(node.type)
}

export function findReferences(tree: Tree, queriedName: string): Range[] {
  const result: Range[] = []

  for (const node of nodesGen(tree.rootNode)) {
    if (!isReference(node) && !isDefinition(node)) continue

    if (getName(node) === queriedName) result.push(getRange(node))
  }

  return result
}
