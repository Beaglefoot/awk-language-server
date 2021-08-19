import * as Parser from 'web-tree-sitter'

export async function initializeParser(): Promise<Parser> {
  await Parser.init()
  const parser = new Parser()

  /**
   * See https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web#generate-wasm-language-files
   *
   * The current files was compiled with:
   * "tree-sitter-awk": "0.0.1",
   * "tree-sitter-cli": "0.19.2"
   */
  const lang = await Parser.Language.load(`${__dirname}/../tree-sitter-awk.wasm`)

  parser.setLanguage(lang)
  return parser
}
