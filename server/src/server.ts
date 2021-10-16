import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
} from 'vscode-languageserver/node'

import { TextDocument } from 'vscode-languageserver-textdocument'
import { QueryCapture } from 'web-tree-sitter'
import { getQueriesList } from './utils'
import { readFileSync } from 'fs'
import { getDocumentation } from './documentation'
import { DependencyMap } from './dependencies'
import { getDocumentSymbolHandler } from './handlers/handleDocumentSymbol'
import { Context, SymbolsByUri, TreesByUri } from './interfaces'
import { getInitializeHandler } from './handlers/handleInitialize'
import { getDidChangeContentHandler } from './handlers/handleDidChangeContent'
import { getDidOpenHandler } from './handlers/handleDidOpen'
import { getCompletionHandler } from './handlers/handleCompletion'
import { getCompletionResolveHandler } from './handlers/handleCompletionResolve'
import { getDefinitionHandler } from './handlers/handleDefinition'
import { getDocumentHighlightHandler } from './handlers/handleDocumentHighlight'
import { getWorkspaceSymbolHandler } from './handlers/handleWorkspaceSymbol'
import { getReferencesHandler } from './handlers/handleReferences'
import { getHoverHandler } from './handlers/handleHover'

// Initialized later
let context = {} as Context

const connection = createConnection(ProposedFeatures.all)
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)
const docs = getDocumentation()
const trees: TreesByUri = {}
const symbols: SymbolsByUri = {}
const dependencies = new DependencyMap()

function registerHandlers() {
  const handleInitialize = getInitializeHandler(context, connection, documents, docs)
  // prettier-ignore
  const handleDidChangeContent = getDidChangeContentHandler(context, trees, symbols, dependencies)
  const handleDidOpen = getDidOpenHandler(context, trees, symbols, dependencies)
  const handleCompletion = getCompletionHandler(symbols, dependencies)
  const handleCompletionResolve = getCompletionResolveHandler(trees, docs)
  const handleDefinition = getDefinitionHandler(trees, symbols, dependencies)
  const handleDocumentHighlight = getDocumentHighlightHandler(trees)
  const handleDocumentSymbol = getDocumentSymbolHandler(symbols)
  const handleWorkspaceSymbol = getWorkspaceSymbolHandler(symbols)
  const handleReferences = getReferencesHandler(trees, dependencies)
  const handleHover = getHoverHandler(trees, symbols, dependencies, docs)

  connection.onInitialize(handleInitialize)
  documents.onDidChangeContent(handleDidChangeContent)
  documents.onDidOpen(handleDidOpen)
  connection.onCompletion(handleCompletion)
  connection.onCompletionResolve(handleCompletionResolve)
  connection.onDefinition(handleDefinition)
  connection.onDocumentHighlight(handleDocumentHighlight)
  connection.onDocumentSymbol(handleDocumentSymbol)
  connection.onWorkspaceSymbol(handleWorkspaceSymbol)
  connection.onReferences(handleReferences)
  connection.onHover(handleHover)
  connection.onRequest('getSemanticTokens', handleSemanticTokens)
}

interface UnencodedSemanticToken {
  line: number
  startChar: number
  length: number
  tokenType: string
  tokenModifiers: string[]
}

function handleSemanticTokens(params: {
  textDocument: TextDocument
}): UnencodedSemanticToken[] {
  const { textDocument } = params
  const tree = trees[textDocument.uri]
  const lang = tree.getLanguage()

  const queriesText = readFileSync(`${__dirname}/../highlights.scm`, 'utf8')
  const queriesList = getQueriesList(queriesText).reverse() // Reverse to prioritize in tree-sitter manner
  const captures: QueryCapture[] = []

  for (const queryString of queriesList) {
    const query = lang.query(queryString)

    if (query.captureNames.length > 1) {
      connection.console.warn(
        `Got more that 1 captureNames: ${query.captureNames.join(', ')}`,
      )
    }

    captures.push(...query.captures(tree.rootNode))
  }

  return captures.map<UnencodedSemanticToken>(({ name, node }) => ({
    line: node.startPosition.row,
    startChar: node.startPosition.column,
    length: node.endIndex - node.startIndex,
    tokenType: name,
    tokenModifiers: [],
  }))
}

function main() {
  registerHandlers()

  documents.listen(connection)
  connection.listen()
}

main()
