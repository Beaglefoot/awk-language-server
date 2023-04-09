import { CompletionItem } from 'vscode-languageserver-protocol/node'
import {
  AWKCompletionItem,
  DataEntryType,
  DocumentationDataEntry,
  enrichWithDocumentation,
  enrichWithSnippetDetails,
  enrichWithSymbolInfo,
  SnippetDataEntry,
  UserDefinedDataEntry,
} from '../completion'
import { Context } from '../interfaces'

export function getCompletionResolveHandler(context: Context) {
  const { trees, docs, snippets } = context

  return function handleCompletionResolve(item: CompletionItem): AWKCompletionItem {
    let result: AWKCompletionItem

    if (item.data?.type === DataEntryType.Documentation) {
      result = enrichWithDocumentation(
        item as AWKCompletionItem<DocumentationDataEntry>,
        docs,
      )
    } else if (item.data?.type === DataEntryType.UserDefined) {
      const { symbolInfo } = item.data as UserDefinedDataEntry

      result = enrichWithSymbolInfo(
        item as AWKCompletionItem<UserDefinedDataEntry>,
        trees[symbolInfo.location.uri],
      )
    } else if (item.data?.type === DataEntryType.Snippet) {
      result = enrichWithSnippetDetails(
        item as AWKCompletionItem<SnippetDataEntry>,
        snippets,
      )
    } else {
      throw new Error('Unsupported CompletionItem type')
    }

    return result
  }
}
