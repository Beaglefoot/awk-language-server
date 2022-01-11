import { execSync } from 'child_process'

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
