// Workaround to make tree-sitter work with nodejs18 as shown here:
// https://github.com/tree-sitter/tree-sitter/issues/1765#issuecomment-1271790298
try {
  //@ts-ignore
  delete WebAssembly.instantiateStreaming
} catch {}
