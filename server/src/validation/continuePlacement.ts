import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver'
import { SyntaxNode } from 'web-tree-sitter'
import { findParent, getRange } from '../utils'
import { ValidationContext } from './validator'

function isLoop(node: SyntaxNode) {
  return [
    'for_statement',
    'for_in_statement',
    'while_statement',
    'do_while_statement',
  ].includes(node.type)
}

export function validateContinuePlacement(context: ValidationContext): Diagnostic | null {
  const { node } = context

  if (node.type === 'continue_statement') {
    if (findParent(node, isLoop)) return null

    return Diagnostic.create(
      getRange(node),
      `'continue' cannot be used outside of loop`,
      DiagnosticSeverity.Error,
    )
  }

  return null
}
