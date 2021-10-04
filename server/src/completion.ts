import {
  CompletionItem,
  CompletionItemKind,
  SymbolInformation,
  SymbolKind,
} from 'vscode-languageserver-types'
import { Documentation, dropParamList } from './documentation'

type UserDefined = 'user_defined'

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

export function enrichCompletionItem(item: CompletionItem, docs: Documentation): void {
  const path = item.data.split('.') as [
    Exclude<keyof Documentation | UserDefined, 'version'>,
    string,
  ]

  if (path[0] === 'user_defined') {
    if (item.kind === CompletionItemKind.Function) item.detail = `User defined function`
    else if (item.kind === CompletionItemKind.Variable)
      item.detail = `User defined variable`
    return
  }

  const documentation = docs[path[0]][path[1]]

  item.detail = path[1]
  item.documentation = documentation
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

  compItem.data = `user_defined.${symbolInfo.name}`

  return compItem
}
