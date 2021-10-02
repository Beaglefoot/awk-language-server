import { readFileSync } from 'fs'
import { URL } from 'url'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { Context } from './context'

export function readDocumentFromUrl(context: Context, url: URL): TextDocument | null {
  let content: string

  try {
    content = readFileSync(url, 'utf8')
  } catch (err) {
    const { message, name } = err as Error
    context.connection.console.error(`${name}: ${message}`)
    return null
  }

  return TextDocument.create(url.href, 'awk', 0, content)
}
