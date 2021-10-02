import { TextDocument } from 'vscode-languageserver-textdocument'
import { SymbolInformation, SymbolKind } from 'vscode-languageserver/node'
import { Tree } from 'web-tree-sitter'
import { Context } from './context'
import { readFromNode } from './io'
import { findParent, getRange, isDefinition, isInclude, nodesGen } from './utils'

export type Symbols = { [name: string]: SymbolInformation[] }

const kinds: { [tree_sitter_type: string]: SymbolKind } = {
  func_def: SymbolKind.Function,
  assignment_exp: SymbolKind.Variable,
}

export function analyze(
  context: Context,
  document: TextDocument,
  deep: boolean,
): Array<{ tree: Tree; symbols: Symbols; document: TextDocument }> {
  const tree = context.parser.parse(document.getText())
  const symbols: { [name: string]: SymbolInformation[] } = {}
  const includedDocuments: TextDocument[] = []

  for (const node of nodesGen(tree.rootNode)) {
    if (deep && isInclude(node) && node.childCount === 2) {
      includedDocuments.push(readFromNode(node, document.uri))
    }

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

  return [
    {
      tree,
      symbols,
      document,
    },
  ].concat(includedDocuments.flatMap((d) => analyze(context, d, true)))
}
