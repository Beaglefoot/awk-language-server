import {
  RenameParams,
  TextEdit,
  WorkspaceEdit,
} from 'vscode-languageserver-protocol/node'
import { Context, TreesByUri, SymbolsByUri } from '../interfaces'
import { findReferences, getName, getNodeAt, isFunction } from '../utils'
import { getAwkFilesInDir, readDocumentFromUrl } from '../io'
import { URL } from 'url'
import { analyze } from '../analyze'
import { DependencyMap } from '../dependencies'

export function getRenameRequestHandler(context: Context, trees: TreesByUri) {
  return async function handleRenameRequest(
    params: RenameParams,
  ): Promise<WorkspaceEdit | null> {
    const { position, textDocument, newName } = params
    const node = getNodeAt(trees[textDocument.uri], position.line, position.character)

    if (!node) return null

    const oldName = getName(node)

    if (!oldName) return null

    if (node.parent && isFunction(node.parent)) {
      const workspaceFolders = await context.connection.workspace.getWorkspaceFolders()
      const urls: URL[] = (workspaceFolders ?? []).flatMap((folder) =>
        getAwkFilesInDir(folder.uri),
      )

      const allTrees: TreesByUri = {}
      const allSymbols: SymbolsByUri = {}
      const allDeps: DependencyMap = new DependencyMap()

      // Analyze every file in a workspace
      for (const url of urls) {
        const document = readDocumentFromUrl(context, url)

        if (!document) continue

        const { tree, symbols, dependencyUris } = analyze(context, document)

        allTrees[url.href] = tree
        allSymbols[url.href] = symbols
        allDeps.update(url.href, new Set(dependencyUris))
      }

      const linkedUris = allDeps.getLinkedUris(textDocument.uri)
      const edits: WorkspaceEdit = {}

      for (const uri of linkedUris) {
        if (!allTrees[uri]) continue
        if (!edits.changes) edits.changes = {}
        if (!edits.changes[uri]) edits.changes[uri] = []

        edits.changes[uri] = findReferences(allTrees[uri], oldName).map((r) =>
          TextEdit.replace(r, newName),
        )
      }

      return edits
    }

    return null
  }
}
