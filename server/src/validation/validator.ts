import { Diagnostic } from 'vscode-languageserver/node'
import { SyntaxNode } from 'web-tree-sitter'
import { DependencyMap } from '../dependencies'
import { Documentation } from '../documentation'
import { SymbolsByUri } from '../interfaces'

export type ValidationContext = {
  node: SyntaxNode
  symbols: SymbolsByUri
  dependencies: DependencyMap
  uri: string
  docs: Documentation
}

export type Validator = (validataionContext: ValidationContext) => Diagnostic | null
