import { Hover, HoverParams } from 'vscode-languageserver/node'
import { getBuiltinHints } from '../hints'
import { getFunctionHoverResult, getIdentifierHoverResult } from '../hover'
import { Context } from '../interfaces'
import { getName, getNamespace, getNodeAt } from '../utils'

export function getHoverHandler(context: Context) {
  const { trees, namespaces, docs } = context

  return function handleHover(params: HoverParams): Hover | null {
    const { uri } = params.textDocument
    const { line, character } = params.position

    let node = getNodeAt(trees[uri], line, character)

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

    const ns = getNamespace(node, namespaces[uri] || new Map())

    if (['func_call', 'func_def'].includes(node.parent?.type || '')) {
      // TODO: Handle namespaces
      return getFunctionHoverResult(context, name, uri)
    }

    if (node.type === 'identifier') {
      return getIdentifierHoverResult(context, name, ns, uri, params.position)
    }

    return null
  }
}
