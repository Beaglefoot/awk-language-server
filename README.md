# AWK Language Server

[![tests](https://github.com/Beaglefoot/awk-language-server/actions/workflows/tests.yml/badge.svg)](https://github.com/Beaglefoot/awk-language-server/actions/workflows/tests.yml)
[![npm](https://img.shields.io/npm/v/awk-language-server)](https://www.npmjs.com/package/awk-language-server)

Implementation of AWK Language Server based on [tree-sitter](https://github.com/tree-sitter/tree-sitter) and [tree-sitter-awk](https://github.com/Beaglefoot/tree-sitter-awk).

## Features

- [x] Syntax highlighting
- [x] Diagnostics
- [x] Autocomplete
  - [x] Builtins
  - [x] User defined symbols
- [x] Hints on hover
  - [x] Builtins
  - [x] User defined symbols
- [x] Go to definition
- [x] Code outline & symbol references
- [x] Document symbols
- [x] Workspace symbols
- [x] Rename symbols
- [ ] Code formatting

## How to use with editors

### VSCode

VSCode extension is developed as part of this project and can be downloaded from marketplace [here](https://marketplace.visualstudio.com/items?itemName=beaglefoot.awk-ide-vscode).

### Vim

- `npm install -g "awk-language-server@>=0.5.2"`
- Choose and install plugin with support for LSP (some examples are below).
- Configure plugin to use `awk-language-server`.

#### [ALE](https://github.com/dense-analysis/ale)

Add following to `.vimrc`:
```vim
call ale#linter#Define('awk', {
\   'name': 'awk-language-server',
\   'lsp': 'stdio',
\   'executable': 'awk-language-server',
\   'command': '%e',
\   'project_root': { _ -> expand('%p:h') }
\})
```

Note that with such configuration `project_root` will be set to directory containing opened awk file.

#### [CoC](https://github.com/neoclide/coc.nvim)

Edit config with `:CocConfig` command and add the following:
```json
{
  "languageserver": {
    "awk": {
      "command": "awk-language-server",
      "args": [],
      "filetypes": ["awk"]
    }
  }
}
```

#### [vim-lsp](https://github.com/prabirshrestha/vim-lsp)

Add to your `.vimrc`:
```vim
if executable('awk-language-server')
    au User lsp_setup call lsp#register_server({
        \ 'name': 'awk-language-server',
        \ 'cmd': {server_info->['awk-language-server']},
        \ 'allowlist': ['awk'],
        \ })
endif
```
