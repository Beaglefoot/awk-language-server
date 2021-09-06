import { Diagnostic, DiagnosticSeverity, _Connection } from 'vscode-languageserver/node'
import { getRange, nodesGen } from './utils'
import { Tree } from 'web-tree-sitter'

export function validate(tree: Tree): Diagnostic[] {
  const diagnostics: Diagnostic[] = []

  for (const node of nodesGen(tree.rootNode)) {
    if (node.type === 'ERROR') {
      diagnostics.push(
        Diagnostic.create(getRange(node), 'Syntax error', DiagnosticSeverity.Error),
      )
      continue
    }

    if (node.isMissing()) {
      diagnostics.push(
        Diagnostic.create(
          getRange(node),
          `Syntax error: missing ${node.type}`,
          DiagnosticSeverity.Warning,
        ),
      )
      continue
    }
  }

  return diagnostics
}
