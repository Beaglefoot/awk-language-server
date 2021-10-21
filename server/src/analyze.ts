import { TextDocument } from 'vscode-languageserver-textdocument'
import { SymbolInformation, SymbolKind } from 'vscode-languageserver/node'
import { SyntaxNode, Tree } from 'web-tree-sitter'
import { Context, SymbolsMap } from './interfaces'
import { readDocumentFromUrl } from './io'
import {
  findParent,
  getDependencyUrl,
  getRange,
  isDefinition,
  isInclude,
  isParamList,
  nodesGen,
} from './utils'

const kinds: { [tree_sitter_type: string]: SymbolKind } = {
  func_def: SymbolKind.Function,
  assignment_exp: SymbolKind.Variable,
  for_in_statement: SymbolKind.Variable,
  getline_input: SymbolKind.Variable,
  param_list: SymbolKind.Variable,
}

function getSymbolInfoFromDefinition(node: SyntaxNode, uri: string): SymbolInformation[] {
  const name =
    node.firstNamedChild!.type === 'array_ref'
      ? node.firstNamedChild!.firstNamedChild!.text
      : node.firstNamedChild!.text

  return [SymbolInformation.create(name, kinds[node.type], getRange(node), uri)]
}

function getSymbolInfoFromParams(node: SyntaxNode, uri: string): SymbolInformation[] {
  const parentFunc = findParent(node, (p) => p.type === 'func_def')!

  return node.children
    .filter((c) => c.type === 'identifier')
    .map((c) =>
      SymbolInformation.create(
        c.text,
        kinds[node.type],
        getRange(c),
        uri,
        parentFunc.firstNamedChild!.text,
      ),
    )
}

export function analyze(
  context: Context,
  document: TextDocument,
  deep: boolean,
): Array<{
  tree: Tree
  symbols: SymbolsMap
  document: TextDocument
  dependencyUris: string[]
}> {
  const tree = context.parser.parse(document.getText())
  const symbols: Map<string, SymbolInformation[]> = new Map()
  const dependencies: TextDocument[] = []
  const dependencyUris: string[] = []

  for (const node of nodesGen(tree.rootNode)) {
    if (isInclude(node) && node.childCount === 2) {
      const url = getDependencyUrl(node, document.uri)

      dependencyUris.push(url.href)

      if (deep) {
        const text = readDocumentFromUrl(context, url)
        if (text) dependencies.push(text)
      }
    }

    let symbolInfo: SymbolInformation[]

    if (isDefinition(node)) {
      symbolInfo = getSymbolInfoFromDefinition(node, document.uri)
    } else if (isParamList(node)) {
      symbolInfo = getSymbolInfoFromParams(node, document.uri)
    } else continue

    for (const si of symbolInfo) {
      if (!symbols.get(si.name)) symbols.set(si.name, [])

      symbols.get(si.name)!.push(si)
    }
  }

  return [
    {
      tree,
      symbols,
      document,
      dependencyUris,
    },
  ].concat(dependencies.flatMap((d) => analyze(context, d, deep)))
}
