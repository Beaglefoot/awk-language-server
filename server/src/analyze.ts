import { TextDocument } from 'vscode-languageserver-textdocument'
import { SymbolInformation, SymbolKind } from 'vscode-languageserver/node'
import { SyntaxNode, Tree } from 'web-tree-sitter'
import { Context, SymbolsMap } from './interfaces'
import { readDocumentFromUrl } from './io'
import {
  findParent,
  getDependencyUrl,
  getName,
  getRange,
  isDefinition,
  isAmongFunctionParams,
  isIdentifier,
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
  identifier: SymbolKind.Variable,
}

function getSymbolInfoFromDefinition(node: SyntaxNode, uri: string): SymbolInformation {
  const firstNamedNode =
    node.firstNamedChild!.type === 'array_ref'
      ? node.firstNamedChild!.firstNamedChild!
      : node.firstNamedChild!

  const name = firstNamedNode.text

  return SymbolInformation.create(name, kinds[node.type], getRange(node), uri)
}

function getSymbolInfoFromParam(node: SyntaxNode, uri: string): SymbolInformation {
  const parentFunc = findParent(node, (p) => p.type === 'func_def')!

  return SymbolInformation.create(
    getName(node)!,
    kinds[node.type],
    getRange(node),
    uri,
    getName(parentFunc.firstNamedChild!)!,
  )
}

function getSymbolInfo(node: SyntaxNode, uri: string): SymbolInformation | null {
  if (!node.parent) return null

  if (isParamList(node.parent)) {
    return getSymbolInfoFromParam(node, uri)
  }

  if (isAmongFunctionParams(node)) return null

  if (isDefinition(node.parent)) {
    return getSymbolInfoFromDefinition(node.parent, uri)
  }

  if (!['func_call'].includes(node.parent.type)) {
    return SymbolInformation.create(getName(node)!, kinds[node.type], getRange(node), uri)
  }

  return null
}

function isKnownSymbol(
  symbols: SymbolInformation[],
  symbolInfo: SymbolInformation,
): boolean {
  for (const symbol of symbols) {
    if (
      symbol.name === symbolInfo.name &&
      symbol.containerName === symbolInfo.containerName
    )
      return true
  }
  return false
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

    if (!isIdentifier(node) /* or not builtin */) continue

    const symbolInfo = getSymbolInfo(node, document.uri)

    if (!symbolInfo) continue
    if (isKnownSymbol(symbols.get(symbolInfo.name) || [], symbolInfo)) continue

    if (!symbols.get(symbolInfo.name)) symbols.set(symbolInfo.name, [])

    symbols.get(symbolInfo.name)!.push(symbolInfo)
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
