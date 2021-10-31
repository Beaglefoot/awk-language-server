import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
} from 'vscode-languageserver/node'

import { TextDocument } from 'vscode-languageserver-textdocument'
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
import { getSemanticTokensHandler } from './handlers/handleSemanticTokens'
import { getRenameRequestHandler } from './handlers/handleRenameRequest'
import { getPrepareRenameHandler } from './handlers/handlePrepareRename'

// Initialized later
let context = {} as Context

const connection =
  require.main === module
    ? createConnection(ProposedFeatures.all)
    : createConnection(process.stdin, process.stdout)
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
  const handleSemanticTokens = getSemanticTokensHandler(trees, connection)
  const handlePrepareRename = getPrepareRenameHandler(trees, connection, docs)
  // prettier-ignore
  const handleRenameRequest = getRenameRequestHandler(context, trees)

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
  connection.onPrepareRename(handlePrepareRename)
  connection.onRenameRequest(handleRenameRequest)
}

function main() {
  registerHandlers()

  documents.listen(connection)
  connection.listen()
}

main()
