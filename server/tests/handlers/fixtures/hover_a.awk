@include "hover_b.awk"

function f(a) {}

BEGIN {
    str = tolower("Hello")
    print f(1) sum(1, 2)
    print str, var_b
    PROCINFO["api_major"]
}
