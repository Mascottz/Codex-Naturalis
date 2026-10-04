# A straight segment reaches the bound

Let N be the number of transverse intersections between the curve and the randomly translated parallel lines. The crossing count is nonnegative, so the event that at least one crossing occurs is bounded by the count itself.

## The mean crossing count

Parametrize the rectifiable curve by arclength as γ(s), with 0 ≤ s ≤ 1. Fix a line normal nθ at angle θ and a translation u chosen uniformly modulo one. The one-dimensional coarea formula gives the mean number of level crossings as the total variation of the projection:

∫₀¹ N(θ,u) du = ∫₀¹ |γ′(s) · nθ| ds.

Averaging over θ uniformly on [0,π), the mean absolute projection of any unit tangent is 2/π. Integrating over the unit arclength gives E[N] = 2/π for every such curve.

## The upper bound

Since 1{N ≥ 1} ≤ N pointwise, taking expectations gives P(N ≥ 1) ≤ E[N] = 2/π. This bound applies to every rectifiable curve of length one, including curves that cross several ruled lines in a single drop.

## Attainment

Take a straight segment of length one. For every orientation its projection along the line normal has length at most one, so for almost every random translation it crosses at most one ruled line. Thus N is either zero or one almost surely, and P(N ≥ 1) = E[N] = 2/π. The straight segment therefore attains the upper bound and is a maximizer.

## Review note

The conclusion follows from the classical Buffon crossing mean and the first-moment bound. The book leaves this proof under review until the rectifiable-curve statement and endpoint conventions receive an independent check.
