import * as fs from 'fs'
import { join } from 'path'
import { MessageConnection } from 'vscode-languageserver-protocol'
import { getConnections, getDummyContext } from '../helpers'
import { TextDocumentChangeEvent } from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { getDidOpenHandler } from '../../src/handlers/handleDidOpen'
import { DependencyMap, DependencyNode } from '../../src/dependencies'
import { initializeParser } from '../../src/parser'
import * as Parser from 'web-tree-sitter'
import { Context, SymbolsByUri, TreesByUri } from '../../src/interfaces'

describe('handleDidOpen', () => {
  let server: MessageConnection
  let parser: Parser
  let context: Context
  let fileContent: string
  let includedFileContent: string
  let uri: string
  let change: TextDocumentChangeEvent<TextDocument>
  const includedUri = 'file:///did_open_inner.awk'

  beforeAll(async () => {
    const connections = getConnections()

    server = connections.server
    parser = await initializeParser()
    fileContent = fs.readFileSync(
      join('server', 'tests', 'handlers', 'fixtures', 'did_open.awk'),
      'utf8',
    )
    includedFileContent = fs.readFileSync(
      join('server', 'tests', 'handlers', 'fixtures', 'did_open_inner.awk'),
      'utf8',
    )
    uri = 'file:///my_file.awk'
    change = {
      document: TextDocument.create(uri, 'awk', 0, fileContent),
    }

    jest.spyOn(fs, 'readFileSync').mockImplementation(() => includedFileContent)
  })

  beforeEach(() => {
    context = getDummyContext(server, parser)
  })

  it('should update trees for included source files', async () => {
    // Arrange
    const trees: TreesByUri = {}
    const handleDidOpen = getDidOpenHandler(context, trees, {}, new DependencyMap())

    // Act
    handleDidOpen(change)

    // Assert
    expect(trees[includedUri]).toHaveProperty('rootNode')
  })

  it('should update symbols for included source files', async () => {
    // Arrange
    const symbols: SymbolsByUri = {}
    const handleDidChangeContent = getDidOpenHandler(
      context,
      {},
      symbols,
      new DependencyMap(),
    )

    // Act
    handleDidChangeContent(change)

    // Assert
    expect(symbols[includedUri].has('f2')).toBeTruthy()
  })

  it('should update dependencies', async () => {
    // Arrange
    const dependencies = new DependencyMap()
    const handleDidChangeContent = getDidOpenHandler(context, {}, {}, dependencies)
    const includedDependencyNode = new DependencyNode()

    includedDependencyNode.childrenUris = new Set()
    includedDependencyNode.parentUris = new Set([uri])

    // Act
    handleDidChangeContent(change)

    // Assert
    expect(dependencies.get(includedUri)).toEqual(includedDependencyNode)
  })
})
