import { CliOptions, Config } from './interfaces'

export function getConfigDefaults() {
  const config: Config = {
    indexing: true,
    trace: {
      server: 'off',
    },
  }

  return config
}

export function cliOptionsToConfig(cliOptions: CliOptions) {
  const config = getConfigDefaults()

  for (const [key, value] of Object.entries(cliOptions)) {
    switch (key) {
      case 'noIndex':
        config['indexing'] = !value
        break
      default:
        throw new Error(`Unhandled cli option: ${key}`)
    }
  }

  return config
}
