# A straight segment reaches the bound

Let N be the number of transverse crossing events with the randomly translated parallel lines, counted with multiplicity along the curve's arclength parameter. Endpoint coincidences and tangencies have probability zero. The crossing count is nonnegative, so the event that at least one crossing occurs is bounded by the count itself.

## The mean crossing count

Parametrize the rectifiable curve by arclength as γ(s), with 0 ≤ s ≤ 1. Fix a line normal nθ at angle θ and a translation u chosen uniformly modulo one. Write pθ(s) = γ(s) · nθ. The ruled lines are the levels pθ = u + k, for integers k. Unfolding one period of offsets into all real levels and applying the one-dimensional area formula gives:

∫₀¹ N(θ,u) du = ∑ₖ∈ℤ ∫₀¹ #{s : pθ(s) = u + k} du = ∫ℝ #{s : pθ(s) = v} dv = ∫₀¹ |γ′(s) · nθ| ds.

This is the Crofton/coarea mean for a rectifiable curve; the exceptional levels with tangencies or endpoint hits have measure zero.

Averaging over θ uniformly on [0,π), the mean absolute projection of any unit tangent is 2/π. Integrating over the unit arclength gives E[N] = 2/π for every such curve.

## The upper bound

Since 1{N ≥ 1} ≤ N pointwise, taking expectations gives P(N ≥ 1) ≤ E[N] = 2/π. This bound applies to every rectifiable curve of length one, including curves that cross several ruled lines in a single drop.

## Attainment

Take a straight segment of length one. For every orientation its projection along the line normal has length at most one, so for almost every random translation it crosses at most one ruled line. Thus N is either zero or one almost surely, and P(N ≥ 1) = E[N] = 2/π. The straight segment therefore attains the upper bound and is a maximizer.

## Source check

Pertti Mattila's *Rectifiability; a survey* states the planar Crofton formula for rectifiable curves in equation (3.4) and the coarea formula in equation (5.3): [arXiv:2112.00540](https://arxiv.org/abs/2112.00540). The displayed identity unfolds offsets modulo one into all real levels, so the periodic-line version follows directly from the cited area formula.

## Review note

The rectifiable-curve mean now has a source and an explicit modulo-one unfolding. C1 remains under review until an independent reader checks the crossing convention and endpoint details; the straight segment attains the bound.
