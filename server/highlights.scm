; tree-sitter-awk v0.3.4

; Order matters

(func_def name: (identifier) @function)
(func_call name: (identifier) @function)

[
  (identifier)
  (field_ref)
] @variable
(field_ref (_) @variable)

(string) @string
(number) @number
(regex) @regexp
(comment) @comment

[
  "function"
  "print"
  "printf"
  "if"
  "else"
  "do"
  "while"
  "for"
  "in"
  "delete"
  "return"
  (break_statement)
  (continue_statement)
  (next_statement)
  (nextfile_statement)
  (getline_input)
  (getline_file)
] @keyword

[
  "@include"
  "@load"
  "@namespace"
  (pattern)
] @namespace

(binary_exp [
  "^"
  "**"
  "*"
  "/"
  "%"
  "+"
  "-"
  "<"
  ">"
  "<="
  ">="
  "=="
  "!="
  "~"
  "!~"
  "in"
  "&&"
  "||"
] @operator)

(unary_exp [
  "!"
  "+"
  "-"
] @operator)

(assignment_exp [
  "="
  "+="
  "-="
  "*="
  "/="
  "%="
  "^="
] @operator)

(ternary_exp [
  "?"
  ":"
] @operator)

(update_exp [
  "++"
  "--"
] @operator)

(redirected_io_statement [
  ">"
  ">>"
] @operator)

(piped_io_statement [
  "|"
  "|&"
] @operator)

[
  ";"
  ","
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @operator
