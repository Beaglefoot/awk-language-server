import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  CompletionItem,
  TextDocumentPositionParams,
  DefinitionParams,
  Location,
  DocumentHighlightParams,
  DocumentHighlight,
  SymbolInformation,
  WorkspaceSymbolParams,
  ReferenceParams,
  HoverParams,
  Hover,
  SymbolKind,
} from 'vscode-languageserver/node'

import { TextDocument } from 'vscode-languageserver-textdocument'
import { QueryCapture } from 'web-tree-sitter'
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
  symbolInfoToCompletionItem,
  UserDefinedDataEntry,
} from './completion'
import { getDocumentation } from './documentation'
import { getBuiltinHints, getFunctionHint, getVariableHint } from './hover'
import { DependencyMap } from './dependencies'
import { getFinalSymbolByPosition, getNearestPrecedingSymbol } from './symbols'
import { getDocumentSymbolHandler } from './handlers/handleDocumentSymbol'
import { Context, SymbolsByUri, TreesByUri } from './interfaces'
import { getInitializeHandler } from './handlers/handleInitialize'
import { getDidChangeContentHandler } from './handlers/handleDidChangeContent'
import { getDidOpenHandler } from './handlers/handleDidOpen'

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

  connection.onInitialize(handleInitialize)
  documents.onDidChangeContent(handleDidChangeContent)
  documents.onDidOpen(handleDidOpen)
  connection.onCompletion(handleCompletion)
  connection.onCompletionResolve(handleCompletionResolve)
  connection.onDefinition(handleDefinition)
  connection.onDocumentHighlight(handleDocumentHighlight)
  connection.onDocumentSymbol(getDocumentSymbolHandler(symbols))
  connection.onWorkspaceSymbol(handleWorkspaceSymbol)
  connection.onReferences(handleReferences)
  connection.onHover(handleHover)
  connection.onRequest('getSemanticTokens', handleSemanticTokens)
}

function handleCompletion(
  textDocumentPosition: TextDocumentPositionParams,
): CompletionItem[] {
  const allDeps = dependencies.getAllBreadthFirst(textDocumentPosition.textDocument.uri)
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
    const allDeps = dependencies.getAllBreadthFirst(params.textDocument.uri)

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

  if (node.type === 'identifier') {
    let nearestSymbol: SymbolInformation | null = null

    if (symbols[params.textDocument.uri].has(name)) {
      nearestSymbol = getNearestPrecedingSymbol(
        params.position,
        symbols[params.textDocument.uri].get(name)!,
      )
    }

    if (!nearestSymbol) {
      const uriWithFinalDefinition = [
        ...dependencies.getAllDepthFirst(params.textDocument.uri),
      ]
        .reverse()
        .find((u) => symbols[u]?.has(name))

      if (!uriWithFinalDefinition) return null

      nearestSymbol = getFinalSymbolByPosition(symbols[uriWithFinalDefinition].get(name)!)
    }

    if (!nearestSymbol) return null

    const definitionNode = getNodeAtRange(
      trees[nearestSymbol.location.uri],
      nearestSymbol.location.range,
    )!

    return {
      contents: {
        kind: 'markdown',
        value: getVariableHint(definitionNode, nearestSymbol.location.uri),
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
