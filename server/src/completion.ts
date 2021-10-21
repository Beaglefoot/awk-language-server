import {
  CompletionItem,
  CompletionItemKind,
  SymbolInformation,
  SymbolKind,
} from 'vscode-languageserver-types'
import { SyntaxNode, Tree } from 'web-tree-sitter'
import { Documentation, dropParamList } from './documentation'
import { getFunctionSignature, getNodeAtRange, getPrecedingComments } from './utils'

export interface UserDefinedDataEntry {
  type: 'user_defined'
  symbolInfo: SymbolInformation
}

const predefinedCompletionListLight: CompletionItem[] = []

export function initCompletionList(docs: Documentation): void {
  predefinedCompletionListLight.push(
    ...Object.keys(docs.builtins).map((key, i) => ({
      label: key,
      kind: CompletionItemKind.Variable,
      data: `builtins.${key}`,
    })),
  )

  predefinedCompletionListLight.push(
    ...Object.keys(docs.functions).map((key, i) => ({
      label: dropParamList(key),
      kind: CompletionItemKind.Function,
      data: `functions.${key}`,
    })),
  )

  predefinedCompletionListLight.push(
    ...Object.keys(docs.io_statements).map((key, i) => ({
      label: key,
      kind: CompletionItemKind.Snippet,
      data: `io_statements.${key}`,
    })),
  )

  predefinedCompletionListLight.push(
    ...Object.keys(docs.patterns).map((key, i) => ({
      label: key,
      kind: CompletionItemKind.Keyword,
      data: `patterns.${key}`,
    })),
  )
}

export function getPredefinedCompletionItems(): CompletionItem[] {
  return predefinedCompletionListLight
}

export function enrichWithDocumentation(item: CompletionItem, docs: Documentation): void {
  const path = item.data.split('.') as [Exclude<keyof Documentation, 'version'>, string]

  const documentation = docs[path[0]][path[1]]

  item.detail = path[1]
  item.documentation = documentation
}

export function enrichWithSymbolInfo(item: CompletionItem, tree: Tree): void {
  const { symbolInfo } = item.data as UserDefinedDataEntry

  if (item.kind === CompletionItemKind.Function) {
    const node = getNodeAtRange(tree, symbolInfo.location.range) as SyntaxNode
    item.detail = getFunctionSignature(node)
    item.documentation = getPrecedingComments(node)
  } else if (item.kind === CompletionItemKind.Variable) {
    item.detail = `User defined variable`
  }
}

export function symbolInfoToCompletionItem(
  symbolInfo: SymbolInformation,
): CompletionItem {
  const compItem = CompletionItem.create(symbolInfo.name)

  if (symbolInfo.kind === SymbolKind.Function) {
    compItem.kind = CompletionItemKind.Function
  } else if (symbolInfo.kind === SymbolKind.Variable) {
    compItem.kind = CompletionItemKind.Variable
  } else {
    compItem.kind = CompletionItemKind.Text
  }

  // For now this interface differs from '.data' for builtins
  compItem.data = {
    type: 'user_defined',
    symbolInfo,
  } as UserDefinedDataEntry

  return compItem
}
