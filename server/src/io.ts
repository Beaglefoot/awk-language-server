import { readFileSync } from 'fs'
import { URL } from 'url'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { SyntaxNode } from 'web-tree-sitter'

/**
 * Supposed to be used with @include node
 */
export function readFromNode(node: SyntaxNode, baseUri: string): TextDocument {
  let filename = node.children[1].text.replaceAll('"', '')

  if (!filename.endsWith('.awk') && !filename.endsWith('.gawk')) {
    // The way GAWK behaves
    filename += '.awk'
  }

  const url = new URL(filename, baseUri)
  const content = readFileSync(url, 'utf8')

  return TextDocument.create(url.href, 'awk', 0, content)
}
