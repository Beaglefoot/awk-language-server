; Order matters

(func_def name: (identifier) @function)
(func_call name: (identifier) @function)

(field_ref) @variable
(field_ref (number) @variable)

(string) @string
(number) @number
(regex) @string.special
(comment) @comment
(identifier) @variable

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
  (break_statement)
  (continue_statement)
  (next_statement)
  (nextfile_statement)
  (getline_statement)
] @keyword

[
  "BEGIN"
  "BEGINFILE"
  "END"
  "ENDFILE"
  "@include"
  "@load"
  "@namespace"
] @constant

[
  ";"
  ","
] @punctuation.delimiter

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
]  @punctuation.bracket

[
  "^"
  "**"
  "*"
  "/"
  "%"
  "+"
  "++"
  "-"
  "--"
  "|"
  "|&"
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
  "?"
  ":"
  "!"
  "="
  "+="
  "-="
  "*="
  "/="
  "%="
  "^="
] @operator  
