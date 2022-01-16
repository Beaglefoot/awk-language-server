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

Formatting requires [prettier](https://github.com/prettier/prettier)
and [prettier-plugin-awk](https://github.com/Beaglefoot/prettier-plugin-awk) installed
either globally or locally in your workspace (in which case it's prioritized).

Formatting on save can be controlled with the following setting:
```json
"[awk]": {
    "editor.formatOnSave": true
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
- [x] Code formatting (requires [prettier-plugin-awk](https://github.com/Beaglefoot/prettier-plugin-awk))
