@include "definition_b.awk"

function f(x) {}

{ f(1); sum(1, 2) }

function a(x) {
    x = 1
}
