import { readFileSync } from 'fs'

export interface Documentation {
  builtins: { [key: string]: string }
  functions: { [key: string]: string }
  io_statements: { [key: string]: string }
  patterns: { [key: string]: string }
  version: string
}

export function getDocumentation(): Documentation {
  const json = readFileSync(`${__dirname}/../docs.json`, 'utf8')
  return JSON.parse(json) as Documentation
}

export function dropParamList(fcall: string): string {
  return fcall.replace(/\(.*\)/, '')
}
