import { relative, dirname } from 'path'
import { FileRename, RenameFilesParams, TextEdit } from 'vscode-languageserver/node'
import { SyntaxNode, Tree } from 'web-tree-sitter'
import { DependencyMap } from '../dependencies'
import { Context, SymbolsByUri, TreesByUri } from '../interfaces'
import { getRange, isInclude } from '../utils'

type ParentURI = string

function getIncludes(tree: Tree): SyntaxNode[] {
  return tree.rootNode.namedChildren.filter(isInclude)
}

function getIncludeEdits(
  changes: Map<ParentURI, FileRename[]>,
  trees: TreesByUri,
): Record<ParentURI, TextEdit[]> {
  const result: Record<ParentURI, TextEdit[]> = {}

  for (const [parentUri, renames] of changes) {
    if (!result[parentUri]) result[parentUri] = []

    const parentDirUri = dirname(parentUri)

    for (const r of renames) {
      const oldRelPath = relative(parentDirUri, r.oldUri)
      const newRelPath = relative(parentDirUri, r.newUri)
      const oldIncludeNode = getIncludes(trees[parentUri]).find((n) => {
        const includeText = n.lastNamedChild!.text.replace(/"/g, '')

        if (includeText.endsWith('.awk') || includeText.endsWith('.gawk')) {
          return includeText === oldRelPath
        }

        return `${includeText}.awk` === oldRelPath
      })

      if (!oldIncludeNode) continue

      const range = getRange(oldIncludeNode)
      const newIncludeText = newRelPath.endsWith('.awk')
        ? newRelPath.slice(0, -4)
        : newRelPath

      result[parentUri].push(TextEdit.replace(range, `@include "${newIncludeText}"`))
    }
  }

  return result
}

export function getRenameFilesHandler(
  context: Context,
  trees: TreesByUri,
  symbols: SymbolsByUri,
  dependencies: DependencyMap,
) {
  return function handleRenameFiles(params: RenameFilesParams): void {
    // TODO: Handle case with dir renaming

    // Multiple file renames might result in multiple changes to the same parent document
    // This allows to aggregate such changes and not change the same file multiple times
    const changesInParents: Map<ParentURI, FileRename[]> = new Map()

    for (const file of params.files) {
      trees[file.newUri] = trees[file.oldUri]
      symbols[file.newUri] = symbols[file.oldUri]

      delete trees[file.oldUri]
      delete symbols[file.oldUri]

      const depNode = dependencies.get(file.oldUri)

      for (const childUri of depNode.childrenUris) {
        dependencies.get(childUri).parentUris.delete(file.oldUri)
        dependencies.get(childUri).parentUris.add(file.newUri)
      }

      for (const parentUri of depNode.parentUris) {
        dependencies.get(parentUri).childrenUris.delete(file.oldUri)
        dependencies.get(parentUri).childrenUris.add(file.newUri)

        if (!changesInParents.has(parentUri)) changesInParents.set(parentUri, [])

        changesInParents.get(parentUri)!.push(file)
      }

      dependencies.set(file.newUri, depNode)
      dependencies.delete(file.oldUri)
    }

    context.connection.workspace.applyEdit({
      changes: getIncludeEdits(changesInParents, trees),
    })
  }
}