import { Documentation, dropParamList } from './documentation'

let builtins: Record<string, string>

function formatDocItem(docSection: Record<string, string>, key: string): string {
  return `**${key}**\n\n${docSection[key].replace(/\\n/g, '\n\n')}`
}

export function getBuiltinHints(docs: Documentation): Record<string, string> {
  if (builtins) return builtins

  const builtins_section: Record<string, string> = {}
  const functions: Record<string, string> = {}
  const io_statements: Record<string, string> = {
    // These have many special cases
    getline: '',
    print: '',
    printf: '',
  }
  const patterns: Record<string, string> = {}

  for (const key of Object.keys(docs.builtins)) {
    builtins_section[key] = formatDocItem(docs.builtins, key)
  }

  for (const key of Object.keys(docs.functions)) {
    functions[dropParamList(key)] = formatDocItem(docs.functions, key)
  }

  for (const key of Object.keys(docs.io_statements)) {
    if (key.includes('(')) {
      io_statements[dropParamList(key)] = `**${key}**\n\n${docs.io_statements[key]}`
    } else if (key.includes('getline')) {
      io_statements['getline'] += `**${key}**\n\n${docs.io_statements[key]}\n\n`
    } else if (key.includes('printf')) {
      io_statements['printf'] += `**${key}**\n\n${docs.io_statements[key]}\n\n`
    } else if (key.includes('print')) {
      io_statements['print'] += `**${key}**\n\n${docs.io_statements[key]}\n\n`
    } else {
      io_statements[key] = docs.io_statements[key]
    }
  }

  for (const key of Object.keys(docs.patterns)) {
    builtins_section[key] = formatDocItem(docs.patterns, key)
  }

  builtins = {
    ...builtins_section,
    ...functions,
    ...io_statements,
    ...patterns,
  }

  return builtins
}
