import {
  Hover,
  HoverParams,
  SymbolInformation,
  SymbolKind,
} from 'vscode-languageserver/node'
import { DependencyMap } from '../dependencies'
import { Documentation } from '../documentation'
import { getBuiltinHints, getFunctionHint, getVariableHint } from '../hover'
import { SymbolsByUri, TreesByUri } from '../interfaces'
import { getFinalSymbolByPosition, getNearestPrecedingSymbol } from '../symbols'
import { getName, getNodeAt, getNodeAtRange } from '../utils'

export function getHoverHandler(
  trees: TreesByUri,
  symbols: SymbolsByUri,
  dependencies: DependencyMap,
  docs: Documentation,
) {
  return function handleHover(params: HoverParams): Hover | null {
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

        nearestSymbol = getFinalSymbolByPosition(
          symbols[uriWithFinalDefinition].get(name)!,
        )
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
}
