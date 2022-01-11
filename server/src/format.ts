import { execSync, spawnSync } from 'child_process'

interface PrettierSupportInfo {
  languages: {
    name: string
    extensions: string[]
    parsers: string[]
  }[]
}

export function isPrettierInstalled(): boolean {
  try {
    execSync('prettier -v', { encoding: 'utf8' })
  } catch (_err) {
    return false
  }

  return true
}

export function isAwkPluginAvailable(): boolean {
  let supportInfoRaw: string

  try {
    supportInfoRaw = execSync('prettier --support-info', { encoding: 'utf8' })
  } catch (_err) {
    return false
  }

  const supportInfo = JSON.parse(supportInfoRaw) as PrettierSupportInfo

  return !!supportInfo.languages.find((l) => l.name.toLocaleLowerCase() === 'awk')
}

export function formatDocument(text: string): string {
  const { stdout, status, error } = spawnSync(
    'prettier',
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
