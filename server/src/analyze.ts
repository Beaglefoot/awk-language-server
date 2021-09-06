import { TextDocument } from 'vscode-languageserver-textdocument'
import { SymbolInformation, SymbolKind } from 'vscode-languageserver/node'
import { SyntaxNode, Tree } from 'web-tree-sitter'
import { Context } from './context'
import { getRange, nodesGen } from './utils'

export type Symbols = { [name: string]: SymbolInformation[] }

const kinds: { [tree_sitter_type: string]: SymbolKind } = {
  func_def: SymbolKind.Function,
  assignment_exp: SymbolKind.Variable,
}

function findParent(
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

export function analyze(
  context: Context,
  document: TextDocument,
): { tree: Tree; symbols: Symbols } {
  const tree = context.parser.parse(document.getText())
  const symbols: { [name: string]: SymbolInformation[] } = {}

  for (const node of nodesGen(tree.rootNode)) {
    if (!['assignment_exp', 'func_def'].includes(node.type)) continue

    if (node.firstNamedChild === null) break

    const name = node.firstNamedChild.text

    if (!symbols[name]) symbols[name] = []

    const parentFunc = findParent(node, (p) => p.type === 'func_def')

    symbols[name].push(
      SymbolInformation.create(
        name,
        kinds[node.type],
        getRange(node),
        document.uri,
        parentFunc?.firstNamedChild?.text || '',
      ),
    )
  }

  return {
    tree,
    symbols,
  }
}
