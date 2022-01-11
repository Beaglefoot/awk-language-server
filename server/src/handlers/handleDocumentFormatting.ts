import {
  Connection,
  DocumentFormattingParams,
  Position,
  Range,
  TextDocuments,
  TextEdit,
  uinteger,
} from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { formatDocument } from '../format'

export function getDocumentFormattingHandler(
  documents: TextDocuments<TextDocument>,
  connection: Connection,
) {
  return (params: DocumentFormattingParams): TextEdit[] => {
    const editedDocument = documents.get(params.textDocument.uri)

    if (!editedDocument) return []

    const text = editedDocument.getText()

    let formattedText: string

    try {
      formattedText = formatDocument(text)
    } catch (err) {
      if (err instanceof Error) {
        connection.window.showErrorMessage(err.message)
      }

      if (typeof err === 'string') {
        connection.window.showErrorMessage(err)
      }

      return []
    }

    const editedRange = Range.create(
      Position.create(0, 0),
      Position.create(editedDocument.lineCount, uinteger.MAX_VALUE),
    )

    return [TextEdit.replace(editedRange, formattedText)]
  }
}
