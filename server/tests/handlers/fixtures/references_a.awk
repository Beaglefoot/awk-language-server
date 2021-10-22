@include "references_b.awk"

function f(x) { x = "f" }

{ f(1); sum(1, 2); x = "global" }
