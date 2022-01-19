import { Connection, DeleteFilesParams } from 'vscode-languageserver/node'
import { DependencyMap } from '../dependencies'
import { Documentation } from '../documentation'
import { SymbolsByUri, TreesByUri } from '../interfaces'
import { validate } from '../validation/validate'

export function getDeleteFilesHandler(
  trees: TreesByUri,
  symbols: SymbolsByUri,
  dependencies: DependencyMap,
  connection: Connection,
  docs: Documentation,
) {
  return function handleDeleteFiles(params: DeleteFilesParams): void {
    for (const file of params.files) {
      const dependents = dependencies.get(file.uri).parentUris

      delete trees[file.uri]
      delete symbols[file.uri]

      for (const depUri of dependents) {
        connection.sendDiagnostics({
          uri: depUri,
          diagnostics: validate(trees[depUri], symbols, dependencies, depUri, docs),
        })
      }
    }
  }
}
