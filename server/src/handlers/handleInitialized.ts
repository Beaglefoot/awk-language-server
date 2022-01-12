import { URL } from 'url'
import {
  WorkDoneProgressServerReporter,
  WorkspaceFolder,
} from 'vscode-languageserver/node'
import { analyze } from '../analyze'
import { DependencyMap } from '../dependencies'
import { Documentation } from '../documentation'
import { initFormatter } from '../format'
import { Context, SymbolsByUri, TreesByUri } from '../interfaces'
import { getAwkFilesInDir, readDocumentFromUrl } from '../io'

export function getInitializedHandler(
  context: Context,
  trees: TreesByUri,
  symbols: SymbolsByUri,
  dependencies: DependencyMap,
  docs: Documentation,
) {
  function index(workspaceFolders: WorkspaceFolder[]) {
    const urls: URL[] = workspaceFolders.flatMap((folder) => getAwkFilesInDir(folder.uri))

    // Analyze every file in a workspace
    for (const url of urls) {
      const document = readDocumentFromUrl(context, url)

      if (!document) continue

      const { tree, symbols: s, dependencyUris } = analyze(context, document, docs)

      trees[url.href] = tree
      symbols[url.href] = s
      dependencies.update(url.href, new Set(dependencyUris))
    }
  }

  return async function handleInitialized() {
    const progressReporter = await context.connection.window.createWorkDoneProgress()
    const workspaceFolders =
      (await context.connection.workspace.getWorkspaceFolders()) ?? []

    progressReporter.begin('Indexing')
    index(workspaceFolders)
    progressReporter.done()

    progressReporter.begin('Initializing formatter')
    initFormatter(workspaceFolders)
    progressReporter.done()
  }
}
