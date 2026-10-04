# small machine; compute the Schechter luminosity function over faint and bright regimes.
using Printf

fmt(value) = @sprintf("%.7g", Float64(value))
alphas = collect(range(-1.8, stop=-0.4, length=15))
luminosity_ratio = 10.0 .^ range(-2.0, stop=1.0, length=121)
curves = [[x^alpha * exp(-x) for x in luminosity_ratio] for alpha in alphas]
array(values) = "[" * join(fmt.(values), ",") * "]"
matrix(values) = "[" * join((array(row) for row in values), ",") * "]"
println("{\"alpha\":" * array(alphas) * ",\"luminosityOverLstar\":" * array(luminosity_ratio) * ",\"phiOverPhiStar\":" * matrix(curves) * "}")
