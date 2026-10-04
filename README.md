# Codex Naturalis

I am building a living book of the mathematics that makes up the earth, the galaxies, nature, and the world. The book of nature is written in mathematics. I keep the rigorous statement beside the intuition, the visualization beside its computation, and every formula beside the humans who gave it language.

## The first page

I ship three pages and a small set of machines:

- **The book** lives at `site/index.html`; twenty-four entries move from the sky to the earth, the living, the invisible, and the structure.
- **The arena** lives at `site/problems.html`; open problems, a public ledger, and a status ladder keep trying visible without pretending that an attempt is a proof.
- **The hall** lives at `site/humans.html`; originator cards are filterable by era and region, with a timeline from Babylon to now.

The book is one long calm page. Every entry has a deep-linkable anchor. The first vertical slice is Euler's identity, phyllotaxis, and the Lorenz attractor; the other twenty-one entries already have plates, sources, statements, intuitions, sliders, and a place in the sequence.

## The machinery

| language | place | reason |
| --- | --- | --- |
| cue | `schemas/`, `data/` | I keep entry, problem, and attempt shapes typed and honest. |
| julia | `scripts/` | I compute the phyllotaxis points and Lorenz trajectory that the page renders. |
| rust | `referee/` | I gate the arena ledger and the problem list with one small binary and no crates. |
| html, css, js | `site/` | I render the static book with no framework, no runtime dependency, and no CDN fetch. |

The generated JSON is committed under `site/data/` because the deployed site is static. The source JSON in `data/` is the content layer; `make compute` copies it and writes the computed fields.

## The local page

```sh
make compute
make check
make serve
```

`make compute` runs Julia when Julia is installed. The small Python fallback keeps the build reproducible in a clean environment, while the Julia scripts remain the technical source of the computed numbers. `make check` compiles the Rust referee when `rustc` is available and uses the same schema checks in Python as a local fallback.

The static output is `site/`. Vercel can deploy that directory directly. `vercel.json` keeps the output directory explicit.

## The arena

I seed the arena with the Millennium problems and a field-spread set of open questions: the Riemann hypothesis, P versus NP, Navier-Stokes existence, Birch and Swinnerton-Dyer, Hodge, Yang-Mills mass gap, Collatz, Goldbach, twin primes, and more. The ladder is meant to grow toward 200 entries, one problem per pull request, with a source attached.

An attempt records a name, date, problem id, link, claim, and status. Status moves from attempted → under review → verified, or withdrawn. I list anyone who tries. I record a solution only when a published peer-reviewed result or a checked formal proof gives it the word verified. The example ledger row is deliberately only attempted.

## The margin

This margin is no longer too small. A short note can bring an alternative proof, an insight, a correction, or a connection. Notes arrive by pull request, keep the author's name and date, and get curated into an entry. One visualization per pull request keeps the ladder climbable.

## The attribution creed

I name contested histories as contested. I praise multiple originators where the mathematics has multiple roots. I keep Indian and Arabic mathematics in the story carried through Fibonacci, the Babylonian and Chinese precedents of the Pythagorean theorem, Lemaître beside Hubble, Faraday beside Maxwell, Weinberg beside Hardy, and Price beside Bayes. The MacTutor History of Mathematics archive at St Andrews is the citation backbone, with primary and problem sources attached in the data.

## Sister machines

I link the machines where the mathematics is shared. `tide.jl` runs Laplace's tides, `night.jl` holds the checks, and `lumen.rs` keeps the color science honest. The book's take it home control copies a one-file implementation for a small experiment in Julia or Rust.

## A quiet rule

No formula dump, no dedicated page per formula, no silent claim, no borrowed visual identity, and no human left in the footnote.
