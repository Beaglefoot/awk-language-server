import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
} from 'vscode-languageserver/node'

import { TextDocument } from 'vscode-languageserver-textdocument'
import { getDocumentation } from './documentation'
import { DependencyMap } from './dependencies'
import { getDocumentSymbolHandler } from './handlers/handleDocumentSymbol'
import { CliOptions, Context, SymbolsByUri, TreesByUri } from './interfaces'
import { getInitializeHandler } from './handlers/handleInitialize'
import { getDidChangeContentHandler } from './handlers/handleDidChangeContent'
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
import { getInitializedHandler } from './handlers/handleInitialized'
import { getDocumentFormattingHandler } from './handlers/handleDocumentFormatting'
import {
  getDidDeleteFilesHandler,
  handleWillDeleteFiles,
} from './handlers/handleDeleteFiles'
import { getCreateFilesHandler } from './handlers/handleCreateFiles'
import { getRenameFilesHandler } from './handlers/handleRenameFiles'

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
  const handleInitialized = getInitializedHandler(
    context,
    trees,
    symbols,
    dependencies,
    docs,
  )
  const handleDidChangeContent = getDidChangeContentHandler(
    context,
    trees,
    symbols,
    dependencies,
    docs,
  )
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
  const handleRenameRequest = getRenameRequestHandler(trees, dependencies)
  const handleDocumentFormatting = getDocumentFormattingHandler(documents, connection)
  const handleDidDeleteFiles = getDidDeleteFilesHandler(
    trees,
    symbols,
    dependencies,
    connection,
    docs,
  )
  const handleCreateFiles = getCreateFilesHandler(
    context,
    trees,
    symbols,
    dependencies,
    docs,
  )
  const handleRenameFiles = getRenameFilesHandler(context, trees, symbols, dependencies)

  connection.onInitialize(handleInitialize)
  connection.onInitialized(handleInitialized)
  documents.onDidChangeContent(handleDidChangeContent)
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
  connection.onDocumentFormatting(handleDocumentFormatting)
  connection.workspace.onWillDeleteFiles(handleWillDeleteFiles)
  connection.workspace.onDidDeleteFiles(handleDidDeleteFiles)
  connection.workspace.onDidCreateFiles(handleCreateFiles)
  connection.workspace.onDidRenameFiles(handleRenameFiles)
}

export function main(cliOptions?: CliOptions) {
  if (cliOptions) context.cliOptions = cliOptions

  registerHandlers()

  documents.listen(connection)
  connection.listen()
}

if (require.main === module) main()
