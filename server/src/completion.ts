import { CompletionItem, CompletionItemKind } from 'vscode-languageserver-types'
import { Documentation } from './documentation'

const completionListLight: CompletionItem[] = []

function dropParamList(fcall: string): string {
  return fcall.replace(/\(.*\)/, '')
}

export function initCompletionList(docs: Documentation): void {
  completionListLight.push(
    ...Object.keys(docs.builtins).map((key, i) => ({
      label: key,
      kind: CompletionItemKind.Variable,
      data: `builtins.${key}`,
    })),
  )

  completionListLight.push(
    ...Object.keys(docs.functions).map((key, i) => ({
      label: dropParamList(key),
      kind: CompletionItemKind.Function,
      data: `functions.${key}`,
    })),
  )

  completionListLight.push(
    ...Object.keys(docs.io_statements).map((key, i) => ({
      label: key,
      kind: CompletionItemKind.Snippet,
      data: `io_statements.${key}`,
    })),
  )

  completionListLight.push(
    ...Object.keys(docs.patterns).map((key, i) => ({
      label: key,
      kind: CompletionItemKind.Keyword,
      data: `patterns.${key}`,
    })),
  )
}

export function getCompletionItems(): CompletionItem[] {
  return completionListLight
}

export function enrichCompletionItem(item: CompletionItem, docs: Documentation): void {
  const path = item.data.split('.') as [Exclude<keyof Documentation, 'version'>, string]
  const documentation = docs[path[0]][path[1]]

  item.detail = path[1]
  item.documentation = documentation
}
