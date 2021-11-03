# AWK IDE

VSCode client extension for AWK Language Server.

## Notes

Syntax highlighting should work out of the box, but if you have issues with it make sure
that you have the following setting enabled either globally or specifically for AWK language.

```json
"[awk]": {
  "editor.semanticHighlighting.enabled": true
}
```

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
