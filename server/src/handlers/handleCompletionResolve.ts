import { CompletionItem } from 'vscode-languageserver-protocol/node'
import {
  enrichWithDocumentation,
  enrichWithSymbolInfo,
  UserDefinedDataEntry,
} from '../completion'
import { Documentation } from '../documentation'
import { TreesByUri } from '../interfaces'

export function getCompletionResolveHandler(trees: TreesByUri, docs: Documentation) {
  return function handleCompletionResolve(item: CompletionItem): CompletionItem {
    if (typeof item.data === 'string') {
      enrichWithDocumentation(item, docs)
    } else if (item.data?.type === 'user_defined') {
      const { symbolInfo } = item.data as UserDefinedDataEntry
      enrichWithSymbolInfo(item, trees[symbolInfo.location.uri])
    }

    return item
  }
}
