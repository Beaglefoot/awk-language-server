import { TextDocument } from 'vscode-languageserver-textdocument'
import { SymbolInformation, SymbolKind } from 'vscode-languageserver/node'
import { Tree } from 'web-tree-sitter'
import { Context } from './context'
import { findParent, getRange, isDefinition, nodesGen } from './utils'

export type Symbols = { [name: string]: SymbolInformation[] }

const kinds: { [tree_sitter_type: string]: SymbolKind } = {
  func_def: SymbolKind.Function,
  assignment_exp: SymbolKind.Variable,
}

export function analyze(
  context: Context,
  document: TextDocument,
): { tree: Tree; symbols: Symbols } {
  const tree = context.parser.parse(document.getText())
  const symbols: { [name: string]: SymbolInformation[] } = {}

  for (const node of nodesGen(tree.rootNode)) {
    if (!isDefinition(node)) continue

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
