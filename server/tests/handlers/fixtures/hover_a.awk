@include "hover_b.awk"
@include "hover_c.awk"

function f(a) {}

BEGIN {
    str = tolower("Hello")
    print f(1) sum(1, 2)
    print str, var_b
    PROCINFO["api_major"]
}

@namespace "A"

BEGIN {
    x = "a"
    print A::x
    print B::x
}
