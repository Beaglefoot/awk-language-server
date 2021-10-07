import { URL } from 'url'
import { Position } from 'vscode-languageserver-textdocument'
import { Range } from 'vscode-languageserver/node'
import { Point, SyntaxNode, Tree } from 'web-tree-sitter'

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

export function getNodeAtRange(tree: Tree, range: Range): SyntaxNode | null {
  if (!tree.rootNode) return null

  return tree.rootNode.descendantForPosition(
    positionToPoint(range.start),
    positionToPoint(range.end),
  )
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

export function isInclude(node: SyntaxNode): boolean {
  return node.type === 'directive' && node?.firstChild?.text === '@include'
}

export function isFunction(node: SyntaxNode): boolean {
  return node.type === 'func_def'
}

export function findReferences(tree: Tree, queriedName: string): Range[] {
  const result: Range[] = []

  for (const node of nodesGen(tree.rootNode)) {
    if (!isReference(node) && !isDefinition(node)) continue

    if (getName(node) === queriedName) result.push(getRange(node))
  }

  return result
}

export function getQueriesList(queriesRawText: string): string[] {
  const result: string[] = []

  let openParenCount = 0
  let openBracketCount = 0
  let isQuoteCharMet = false
  let isComment = false
  let currentQuery = ''

  for (const char of queriesRawText) {
    if (char === '"') isQuoteCharMet = !isQuoteCharMet
    if (isQuoteCharMet) {
      currentQuery += char
      continue
    } else if (!isQuoteCharMet && char === ';') isComment = true
    else if (isComment && char !== '\n') continue
    else if (char === '(') openParenCount++
    else if (char === ')') openParenCount--
    else if (char === '[') openBracketCount++
    else if (char === ']') openBracketCount--
    else if (char === '\n') {
      isComment = false

      if (!openParenCount && !openBracketCount && currentQuery) {
        result.push(currentQuery.trim())
        currentQuery = ''
      }

      continue
    }

    if (!isComment) currentQuery += char
  }

  return result
}

export function getDependencyUrl(node: SyntaxNode, baseUri: string): URL {
  let filename = node.children[1].text.replaceAll('"', '')

  if (!filename.endsWith('.awk') && !filename.endsWith('.gawk')) {
    // The way GAWK behaves
    filename += '.awk'
  }

  return new URL(filename, baseUri)
}

export function positionToPoint(pos: Position): Point {
  return {
    row: pos.line,
    column: pos.character,
  }
}

export function getFunctionSignature(node: SyntaxNode): string {
  if (!isFunction(node)) {
    throw new Error(`Node type ${node.type} is not a function`)
  }

  const params = node
    .descendantsOfType('param_list')[0]
    .text.replaceAll(/#.*/g, '')
    .replaceAll(/\s+/g, ' ')

  return `${(node.firstNamedChild as SyntaxNode).text}(${params})`
}
