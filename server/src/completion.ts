import { readFileSync } from 'fs'
import { CompletionItem, CompletionItemKind } from 'vscode-languageserver-types'

interface Completions {
  builtins: { [key: string]: string }
  functions: { [key: string]: string }
  io_statements: { [key: string]: string }
  patterns: { [key: string]: string }
  version: string
}

const completionListLight: CompletionItem[] = []
let completions: Completions

function dropParamList(fcall: string): string {
  return fcall.replace(/\(.*\)/, '')
}

export function initCompletionList(): void {
  const json = readFileSync(`${__dirname}/../completions.json`, 'utf8')

  completions = JSON.parse(json) as Completions

  completionListLight.push(
    ...Object.keys(completions.builtins).map((key, i) => ({
      label: key,
      kind: CompletionItemKind.Variable,
      data: `builtins.${key}`,
    })),
  )

  completionListLight.push(
    ...Object.keys(completions.functions).map((key, i) => ({
      label: dropParamList(key),
      kind: CompletionItemKind.Function,
      data: `functions.${key}`,
    })),
  )

  completionListLight.push(
    ...Object.keys(completions.io_statements).map((key, i) => ({
      label: key,
      kind: CompletionItemKind.Snippet,
      data: `io_statements.${key}`,
    })),
  )

  completionListLight.push(
    ...Object.keys(completions.patterns).map((key, i) => ({
      label: key,
      kind: CompletionItemKind.Keyword,
      data: `patterns.${key}`,
    })),
  )
}

export function getCompletionItems(): CompletionItem[] {
  return completionListLight
}

export function enrichCompletionItem(item: CompletionItem): void {
  const path = item.data.split('.') as [Exclude<keyof Completions, 'version'>, string]
  const documentation = completions[path[0]][path[1]]

  item.detail = path[1]
  item.documentation = documentation
}

initCompletionList()
