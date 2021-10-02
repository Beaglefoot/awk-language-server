import { readFileSync } from 'fs'
import { URL } from 'url'
import { TextDocument } from 'vscode-languageserver-textdocument'

export function readDocumentFromUrl(url: URL): TextDocument | null {
  let content: string

  try {
    content = readFileSync(url, 'utf8')
  } catch (err) {
    console.error(err)
    return null
  }

  return TextDocument.create(url.href, 'awk', 0, content)
}
