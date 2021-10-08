import { readFileSync } from 'fs'

export type Title = string
export type Description = string

export interface Documentation {
  builtins: Record<Title, Description>
  functions: Record<Title, Description>
  io_statements: Record<Title, Description>
  patterns: Record<Title, Description>
  version: string
}

export function getDocumentation(): Documentation {
  const json = readFileSync(`${__dirname}/../docs.json`, 'utf8')
  return JSON.parse(json) as Documentation
}

export function dropParamList(fcall: string): string {
  return fcall.replace(/\(.*\)/, '')
}
