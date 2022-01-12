import { execSync, spawnSync } from 'child_process'
import { WorkspaceFolder } from 'vscode-languageserver'
import { fileURLToPath } from 'url'
import { resolve } from 'path'

interface PrettierSupportInfo {
  languages: {
    name: string
    extensions: string[]
    parsers: string[]
  }[]
}

let prettierCmd = ''

export function initFormatter(workspaceFolders: WorkspaceFolder[]) {
  for (const wsf of workspaceFolders) {
    const prettierPath = resolve(
      fileURLToPath(wsf.uri),
      'node_modules',
      '.bin',
      'prettier',
    )

    if (isAwkPluginAvailable(prettierPath)) {
      prettierCmd = prettierPath
      return
    }
  }

  if (isAwkPluginAvailable('prettier')) prettierCmd = 'prettier'
}

export function isAwkPluginAvailable(prettierCmd: string): boolean {
  let supportInfoRaw: string

  try {
    supportInfoRaw = execSync(`${prettierCmd} --support-info`, { encoding: 'utf8' })
  } catch (_err) {
    return false
  }

  const supportInfo = JSON.parse(supportInfoRaw) as PrettierSupportInfo

  return supportInfo.languages.some((l) => l.name.toLocaleLowerCase() === 'awk')
}

export function formatDocument(text: string): string | null {
  if (!prettierCmd) return null

  const { stdout, status, error } = spawnSync(
    prettierCmd,
    ['--parser', 'awk-parse', '--loglevel', 'silent'],
    {
      input: text,
      encoding: 'utf8',
    },
  )

  if (status !== 0) {
    throw new Error('Cannot format document. Make sure there is no syntax error')
  }

  if (error) {
    throw error
  }

  return stdout
}
