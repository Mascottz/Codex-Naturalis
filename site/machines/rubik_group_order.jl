# small machine; count the reachable fixed-center 3x3 cube positions from cubie constraints.
using Printf

order = factorial(big(8)) * big(3)^7 * factorial(big(12)) * big(2)^11 ÷ 2
expected = big(43_252_003_274_489_856_000)
order == expected || error("the cubie constraints do not match the published group order")
println(order)
