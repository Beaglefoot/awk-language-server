import {
  Hover,
  Position,
  SymbolInformation,
  SymbolKind,
} from 'vscode-languageserver/node'
import { SyntaxNode } from 'web-tree-sitter'
import { getFunctionHint, getVariableHint } from './hints'
import { Context } from './interfaces'
import { getFinalSymbolByPosition, getNearestPrecedingSymbol } from './symbols'
import { getNodeAtRange, isBlock, isIdentifier, isParamList } from './utils'

export function getFunctionHoverResult(
  context: Context,
  nodeName: string,
  uri: string,
): Hover | null {
  const { dependencies, symbols, trees } = context

  const allDeps = dependencies.getLinkedUris(uri)

  let funcDefinitionSymbol: SymbolInformation | undefined

  for (const uri of allDeps) {
    if (symbols[uri]?.has(nodeName)) {
      funcDefinitionSymbol = symbols[uri]
        .get(nodeName)!
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

export function getIdentifierHoverResult(
  context: Context,
  nodeName: string,
  uri: string,
  position: Position,
): Hover | null {
  const { trees, symbols, dependencies } = context

  let nearestSymbol: SymbolInformation | null = null

  if (symbols[uri].has(nodeName)) {
    nearestSymbol = getNearestPrecedingSymbol(position, symbols[uri].get(nodeName)!)
  }

  if (!nearestSymbol) {
    const uriWithFinalDefinition = [...dependencies.getAllDepthFirst(uri)]
      .reverse()
      .find((u) => symbols[u]?.has(nodeName))

    if (!uriWithFinalDefinition) return null

    nearestSymbol = getFinalSymbolByPosition(
      symbols[uriWithFinalDefinition].get(nodeName)!,
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
      value: getVariableHint(
        getDefinitionText(definitionNode),
        nearestSymbol.location.uri,
      ),
    },
  }
}

function getDefinitionText(node: SyntaxNode): string {
  if (isIdentifier(node) && node.parent) {
    if (isParamList(node.parent)) {
      const funcDefNode = node.parent.parent!
      const firstLineOfText = funcDefNode.text.split('\n')[0]

      return firstLineOfText.includes(')')
        ? firstLineOfText.replace(/{/, '').trim()
        : `${funcDefNode.children[0].text} ${funcDefNode.children[1].text} (...${node.text})`
    }

    if (isBlock(node.parent)) {
      const offset = node.startPosition.row - node.parent.startPosition.row

      return node.parent.text
        .split('\n')
        .filter((_, i) => offset - 1 <= i && i <= offset + 1)
        .join('\n')
    }

    return node.parent.text.split('\n')[0].trim()
  }

  return node.text.trim()
}
