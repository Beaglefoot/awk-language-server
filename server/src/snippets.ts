import { readFileSync } from 'fs'

export type SnippetTitle = string

interface SnippetInfo {
  description: string
  prefix: string
  body: string[]
}

export type Snippets = Record<SnippetTitle, SnippetInfo>

export function getSnippets(): Snippets {
  const json = readFileSync(`${__dirname}/../snippets.json`, 'utf8')
  return JSON.parse(json) as Snippets
}
