import {
  Diagnostic,
  DiagnosticSeverity,
  Range,
  _Connection,
} from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { Context } from './context'
import { SyntaxNode } from 'web-tree-sitter'

export type TextDocumentValidator = (textDocument: TextDocument) => Promise<void>

function* nodesGen(node: SyntaxNode) {
  const queue: SyntaxNode[] = [node]

  while (queue.length) {
    const n = queue.shift()

    if (!n) return

    if (n.children.length) {
      queue.unshift(...n.children)
    }

    yield n
  }
}

function getRange(node: SyntaxNode): Range {
  return Range.create(
    node.startPosition.row,
    node.startPosition.column,
    node.endPosition.row,
    node.endPosition.column,
  )
}

export async function validateTextDocument(
  context: Context,
  textDocument: TextDocument,
): Promise<void> {
  const text = textDocument.getText()
  const tree = context.parser.parse(text)
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

  context.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics })
}
