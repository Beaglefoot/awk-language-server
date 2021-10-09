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
  SymbolKind,
} from 'vscode-languageserver/node'

import { TextDocument } from 'vscode-languageserver-textdocument'
import { Context } from './context'
import { initializeParser } from './parser'
import { validate } from './validate'
import { analyze, Symbols } from './analyze'
import { QueryCapture, Tree } from 'web-tree-sitter'
import {
  getNodeAt,
  getName,
  findReferences,
  getQueriesList,
  getNodeAtRange,
} from './utils'
import { readFileSync } from 'fs'
import {
  enrichWithDocumentation,
  enrichWithSymbolInfo,
  getPredefinedCompletionItems,
  initCompletionList,
  symbolInfoToCompletionItem,
  UserDefinedDataEntry,
} from './completion'
import { getDocumentation } from './documentation'
import { getBuiltinHints, getFunctionHint } from './hover'
import { DependencyMap } from './dependencies'

let context: Context

const connection = createConnection(ProposedFeatures.all)
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)
const docs = getDocumentation()
const trees: { [uri: string]: Tree } = {}
const symbols: { [uri: string]: Symbols } = {}
const dependencies = new DependencyMap()

function registerHandlers() {
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
  const results = analyze(context, change.document, false)
  const diagnostics = validate(results[0].tree)

  trees[change.document.uri] = results[0].tree
  symbols[change.document.uri] = results[0].symbols

  dependencies.update(change.document.uri, new Set(results[0].dependencyUris))

  context.connection.sendDiagnostics({ uri: change.document.uri, diagnostics })
}

function handleDidOpen(change: TextDocumentChangeEvent<TextDocument>) {
  const results = analyze(context, change.document, true)

  for (const { tree, symbols: documentSymbols, document, dependencyUris } of results) {
    trees[document.uri] = tree
    symbols[document.uri] = documentSymbols
    dependencies.update(document.uri, new Set(dependencyUris))
  }
}

function handleCompletion(
  textDocumentPosition: TextDocumentPositionParams,
): CompletionItem[] {
  const allDeps = dependencies.getAll(textDocumentPosition.textDocument.uri)
  const allSymbols = [...allDeps]
    .filter((uri) => symbols[uri])
    .flatMap((uri) => [...symbols[uri].values()].flat())

  return allSymbols.map(symbolInfoToCompletionItem).concat(getPredefinedCompletionItems())
}

function handleCompletionResolve(item: CompletionItem): CompletionItem {
  if (typeof item.data === 'string') {
    enrichWithDocumentation(item, docs)
  } else if (item.data?.type === 'user_defined') {
    const { symbolInfo } = item.data as UserDefinedDataEntry
    enrichWithSymbolInfo(item, trees[symbolInfo.location.uri])
  }

  return item
}

function handleDefinition(params: DefinitionParams): Location[] {
  const { textDocument, position } = params
  const node = getNodeAt(trees[textDocument.uri], position.line, position.character)

  if (!node) return []

  const name = getName(node)

  if (!name) return []

  return Object.keys(symbols)
    .filter(
      (uri) =>
        symbols[uri].get(name) &&
        (uri === textDocument.uri || dependencies.hasParent(uri, textDocument.uri)),
    )
    .flatMap((uri) => (symbols[uri].get(name) || []).map((s) => s.location))
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
  return [...symbols[params.textDocument.uri].values()].flat()
}

function handleWorkspaceSymbol(params: WorkspaceSymbolParams): SymbolInformation[] {
  const result: SymbolInformation[] = []
  const symbolBuckets = Object.values(symbols)

  for (const sb of symbolBuckets) {
    const matchedNames: string[] = []

    for (const name of sb.keys()) {
      if (name.includes(params.query)) matchedNames.push(name)
    }

    result.push(...matchedNames.flatMap((n) => sb.get(n) || []))
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
    if (
      uri !== textDocument.uri &&
      !dependencies.hasParent(textDocument.uri, uri) &&
      !dependencies.hasParent(uri, textDocument.uri)
    )
      continue

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

  const name = getName(node)

  if (!name) return null

  const builtins = getBuiltinHints(docs)

  if (builtins[name]) {
    return { contents: { kind: 'markdown', value: builtins[name] } }
  }

  if (['func_call', 'func_def'].includes(node.parent?.type || '')) {
    const allDeps = dependencies.getAll(params.textDocument.uri)

    let funcDefinitionSymbol: SymbolInformation | undefined

    for (const uri of allDeps) {
      if (symbols[uri]?.has(name)) {
        funcDefinitionSymbol = symbols[uri]
          .get(name)!
          .find((si) => si.kind === SymbolKind.Function)

        if (funcDefinitionSymbol) break
      }
    }

    if (!funcDefinitionSymbol) return null

    const funcDefinitionNode = getNodeAtRange(
      trees[funcDefinitionSymbol.location.uri],
      funcDefinitionSymbol.location.range,
    )!

    return {
      contents: {
        kind: 'markdown',
        value: getFunctionHint(funcDefinitionNode),
      },
    }
  }

  return null
}

function main() {
  registerHandlers()

  documents.listen(connection)
  connection.listen()
}

main()
