import { InsertTextFormat } from 'vscode-languageserver'
import {
  CompletionItem,
  CompletionItemKind,
  SymbolInformation,
  SymbolKind,
} from 'vscode-languageserver-types'
import { SyntaxNode, Tree } from 'web-tree-sitter'
import { Documentation, dropParamList } from './documentation'
import { Snippets } from './snippets'
import { getFunctionSignature, getNodeAtRange, getPrecedingComments } from './utils'

export enum DataEntryType {
  UserDefined,
  Documentation,
  Snippet,
}

interface DataEntry {
  type: DataEntryType
}

export interface UserDefinedDataEntry extends DataEntry {
  type: DataEntryType.UserDefined
  symbolInfo: SymbolInformation
}

export interface DocumentationDataEntry extends DataEntry {
  type: DataEntryType.Documentation
  jsonPath: string
}

export interface SnippetDataEntry extends DataEntry {
  type: DataEntryType.Snippet
}

export interface AWKCompletionItem<T extends DataEntry = DataEntry>
  extends CompletionItem {
  data: T
}

const predefinedCompletionListLight: AWKCompletionItem[] = []

export function initCompletionList(docs: Documentation, snippets: Snippets): void {
  predefinedCompletionListLight.push(
    ...Object.keys(docs.builtins).map((key, i) => ({
      label: key,
      kind: CompletionItemKind.Variable,
      data: { type: DataEntryType.Documentation, jsonPath: `builtins.${key}` },
    })),
  )

  predefinedCompletionListLight.push(
    ...Object.keys(docs.functions).map((key, i) => ({
      label: dropParamList(key),
      kind: CompletionItemKind.Function,
      data: { type: DataEntryType.Documentation, jsonPath: `functions.${key}` },
    })),
  )

  predefinedCompletionListLight.push(
    ...Object.keys(docs.io_statements).map((key, i) => ({
      label: key,
      kind: CompletionItemKind.Snippet,
      data: { type: DataEntryType.Documentation, jsonPath: `io_statements.${key}` },
    })),
  )

  predefinedCompletionListLight.push(
    ...Object.keys(docs.patterns).map((key, i) => ({
      label: key,
      kind: CompletionItemKind.Keyword,
      data: { type: DataEntryType.Documentation, jsonPath: `patterns.${key}` },
    })),
  )

  predefinedCompletionListLight.push(
    ...Object.entries(snippets).map(([title, info]) => ({
      label: info.prefix,
      kind: CompletionItemKind.Snippet,
      data: { type: DataEntryType.Snippet },

      detail: info.description,
      insertText: info.body.join('\n'),
      insertTextFormat: InsertTextFormat.Snippet,
    })),
  )
}

export function getPredefinedCompletionItems(): AWKCompletionItem[] {
  return predefinedCompletionListLight
}

export function enrichWithDocumentation(
  item: AWKCompletionItem<DocumentationDataEntry>,
  docs: Documentation,
): AWKCompletionItem<DocumentationDataEntry> {
  const path = item.data.jsonPath.split('.') as [
    Exclude<keyof Documentation, 'version'>,
    string,
  ]

  const documentation = docs[path[0]][path[1]]

  item.detail = path[1]
  item.documentation = documentation

  return item
}

export function enrichWithSnippetDetails(
  item: AWKCompletionItem<SnippetDataEntry>,
  snippets: Snippets,
): AWKCompletionItem<SnippetDataEntry> {
  const info = snippets[item.label]

  item.detail = info.description
  item.insertTextFormat = InsertTextFormat.Snippet
  item.insertText = info.body.join('\n')

  return item
}

export function enrichWithSymbolInfo(
  item: AWKCompletionItem<UserDefinedDataEntry>,
  tree: Tree,
): AWKCompletionItem<UserDefinedDataEntry> {
  const { symbolInfo } = item.data as UserDefinedDataEntry

  if (item.kind === CompletionItemKind.Function) {
    const node = getNodeAtRange(tree, symbolInfo.location.range) as SyntaxNode
    item.detail = getFunctionSignature(node)
    item.documentation = getPrecedingComments(node)
  } else if (item.kind === CompletionItemKind.Variable) {
    item.detail = `User defined variable`
  }

  return item
}

const symbolCompletionKindMap = {
  [SymbolKind.Function]: CompletionItemKind.Function,
  [SymbolKind.Variable]: CompletionItemKind.Variable,
} as Record<SymbolKind, CompletionItemKind>

function getCompletionKind(symbolInfo: SymbolInformation, namespaceUnderCursor: string) {
  if (
    symbolInfo.containerName?.includes('::') &&
    symbolInfo.containerName !== namespaceUnderCursor
  ) {
    return CompletionItemKind.Text
  }

  return symbolCompletionKindMap[symbolInfo.kind] || CompletionItemKind.Text
}

export function symbolInfoToCompletionItem(
  symbolInfo: SymbolInformation,
  namespaceUnderCursor: string,
): AWKCompletionItem {
  const label =
    symbolInfo.containerName === namespaceUnderCursor ||
    symbolInfo.containerName?.includes('::')
      ? symbolInfo.name
      : `${symbolInfo.containerName}::${symbolInfo.name}`

  const compItem = CompletionItem.create(label) as AWKCompletionItem<UserDefinedDataEntry>

  compItem.kind = getCompletionKind(symbolInfo, namespaceUnderCursor)

  compItem.data = {
    type: DataEntryType.UserDefined,
    symbolInfo,
  }

  return compItem
}
