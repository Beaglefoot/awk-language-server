import { Description, Documentation, dropParamList, Title } from './documentation'

let builtins: Record<Title, Description>

function formatDocItem(docSection: Record<Title, Description>, title: Title): string {
  return `**${title}**\n\n${docSection[title].replace(/\\n/g, '\n\n')}`
}

export function getBuiltinHints(docs: Documentation): Record<Title, Description> {
  if (builtins) return builtins

  const builtins_section: Record<Title, Description> = {}
  const functions: Record<Title, Description> = {}
  const io_statements: Record<Title, Description> = {
    // These have many special cases
    getline: '',
    print: '',
    printf: '',
  }
  const patterns: Record<Title, Description> = {}

  for (const title of Object.keys(docs.builtins)) {
    builtins_section[title] = formatDocItem(docs.builtins, title)
  }

  for (const title of Object.keys(docs.functions)) {
    functions[dropParamList(title)] = formatDocItem(docs.functions, title)
  }

  for (const title of Object.keys(docs.io_statements)) {
    if (title.includes('(')) {
      io_statements[dropParamList(title)] = `**${title}**\n\n${docs.io_statements[title]}`
    } else if (title.includes('getline')) {
      io_statements['getline'] += `**${title}**\n\n${docs.io_statements[title]}\n\n`
    } else if (title.includes('printf')) {
      io_statements['printf'] += `**${title}**\n\n${docs.io_statements[title]}\n\n`
    } else if (title.includes('print')) {
      io_statements['print'] += `**${title}**\n\n${docs.io_statements[title]}\n\n`
    } else {
      io_statements[title] = docs.io_statements[title]
    }
  }

  for (const title of Object.keys(docs.patterns)) {
    builtins_section[title] = formatDocItem(docs.patterns, title)
  }

  builtins = {
    ...builtins_section,
    ...functions,
    ...io_statements,
    ...patterns,
  }

  return builtins
}
