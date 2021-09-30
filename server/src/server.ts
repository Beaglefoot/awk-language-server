import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  CompletionItem,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  TextDocumentChangeEvent,
  DefinitionParams,
  Location,
  DocumentHighlightParams,
  DocumentHighlight,
  DocumentSymbolParams,
  SymbolInformation,
  WorkspaceSymbolParams,
  ReferenceParams,
  HoverParams,
  Hover,
} from 'vscode-languageserver/node'

import { TextDocument } from 'vscode-languageserver-textdocument'
import { Context } from './context'
import { initializeParser } from './parser'
import { validate } from './validate'
import { analyze, Symbols } from './analyze'
import { QueryCapture, Tree } from 'web-tree-sitter'
import { getNodeAt, getName, findReferences, getQueriesList } from './utils'
import { readFileSync } from 'fs'
import {
  enrichCompletionItem,
  getCompletionItems,
  initCompletionList,
} from './completion'
import { getDocumentation } from './documentation'
import { getBuiltinHints } from './hover'

let context: Context

const connection = createConnection(ProposedFeatures.all)
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)
const docs = getDocumentation()
const trees: { [uri: string]: Tree } = {}
const symbols: { [uri: string]: Symbols } = {}

function registerHandlers() {
  connection.onInitialize(handleInitialize)
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
}

async function handleInitialize(params: InitializeParams): Promise<InitializeResult> {
  const parser = await initializeParser()
  initCompletionList(docs)

  context = { connection, documents, capabilities: params.capabilities, parser }

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
      },
      definitionProvider: true,
      documentHighlightProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      referencesProvider: true,
      hoverProvider: true,
    },
  }

  return result
}

function handleDidChangeContent(change: TextDocumentChangeEvent<TextDocument>) {
  const results = analyze(context, change.document)
  const diagnostics = validate(results[0].tree)

  for (const { tree, symbols: documentSymbols, document } of results) {
    trees[document.uri] = tree
    symbols[document.uri] = documentSymbols
  }

  context.connection.sendDiagnostics({ uri: change.document.uri, diagnostics })
}

function handleCompletion(
  _textDocumentPosition: TextDocumentPositionParams,
): CompletionItem[] {
  return getCompletionItems()
}

function handleCompletionResolve(item: CompletionItem): CompletionItem {
  enrichCompletionItem(item, docs)
  return item
}

function handleDefinition(params: DefinitionParams): Location[] {
  const { textDocument, position } = params
  const node = getNodeAt(trees[textDocument.uri], position.line, position.character)

  if (!node) return []

  const name = getName(node)

  if (!name) return []

  return Object.keys(symbols)
    .filter((uri) => symbols[uri][name])
    .flatMap((uri) => symbols[uri][name].map((s) => s.location))
}

function handleDocumentHighlight(params: DocumentHighlightParams): DocumentHighlight[] {
  const { textDocument, position } = params
  let node = getNodeAt(trees[textDocument.uri], position.line, position.character)

  if (!node) return []
  if (node.type === 'number' && node.parent?.type === 'field_ref') {
    node = node.parent
  }

  const queriedName = getName(node)

  if (!queriedName) return []

  const tree = trees[textDocument.uri]

  return findReferences(tree, queriedName).map((range) => DocumentHighlight.create(range))
}

function handleDocumentSymbol(params: DocumentSymbolParams): SymbolInformation[] {
  return Object.values(symbols[params.textDocument.uri]).flat()
}

function handleWorkspaceSymbol(params: WorkspaceSymbolParams): SymbolInformation[] {
  const result: SymbolInformation[] = []
  const symbolBuckets = Object.values(symbols)

  for (const sb of symbolBuckets) {
    const matchedNames = Object.keys(sb).filter((name) => name.includes(params.query))
    result.push(...matchedNames.flatMap((n) => sb[n]))
  }

  return result
}

function handleReferences(params: ReferenceParams): Location[] {
  const { textDocument, position } = params
  const node = getNodeAt(trees[textDocument.uri], position.line, position.character)

  if (!node) return []

  const name = getName(node)

  if (!name) return []

  const result: Location[] = []

  for (const uri of Object.keys(trees)) {
    result.push(
      ...findReferences(trees[uri], name).map((range) => Location.create(uri, range)),
    )
  }

  return result
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

function handleHover(params: HoverParams): Hover | null {
  const tree = trees[params.textDocument.uri]
  const { line, character } = params.position
  let node = getNodeAt(tree, line, character)

  if (!node) return null

  if (node.type === 'string' && node.parent?.type === 'array_ref') {
    node = node.parent
  }

  if (!node.text) return null

  const builtins = getBuiltinHints(docs)

  if (builtins[node.text]) {
    return { contents: { kind: 'markdown', value: builtins[node.text] } }
  }

  return null
}

function main() {
  registerHandlers()

  documents.listen(connection)
  connection.listen()
}

main()
