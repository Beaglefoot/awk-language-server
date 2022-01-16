import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver'
import { getFunctionName, getRange } from '../utils'
import { ValidationContext } from './validator'

function isSameRange(range1: Range, range2: Range): boolean {
  return (
    range1.start.line === range2.start.line &&
    range1.start.character === range2.start.character &&
    range1.end.line === range2.end.line &&
    range1.end.character === range2.end.character
  )
}

export function validateNameCollision(context: ValidationContext): Diagnostic | null {
  const { node, dependencies, symbols, uri } = context

  if (node.type === 'func_def') {
    const name = getFunctionName(node)
    const range = getRange(node)
    const linkedUris = dependencies.getLinkedUris(uri)
    const existingDefinition = [...linkedUris]
      .map((u) => symbols[u])
      .find((sm) => sm.has(name))
      ?.get(name)![0]!

    const { uri: eduri, range: edrange } = existingDefinition.location

    if (uri !== eduri || !isSameRange(range, edrange)) {
      return Diagnostic.create(
        range,
        `Function name must be unique`,
        DiagnosticSeverity.Error,
      )
    }
  }

  return null
}
