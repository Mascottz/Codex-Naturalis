# Codex naturalis

Galileo said the book of nature is written in mathematics; this is my copy of it. the earth, the galaxies, the living world, and the invisible one, set down as twenty-four living formulas; each one moves on screen, each one keeps the name of the human who first saw it, and the contested histories get told honestly.

The rigorous statement for mathematicians, and the intuition for everyone else who wants to see the world through mathematics. julia computes the numbers the pages render, cue holds the data against its schemas, a rust referee guards the arena on every pull request, and the site itself stays zero-dependency and static, because a book should open instantly.

## The pages

- **The book** lives at `site/index.html`; twenty-four entries from the sky to the earth, the living, the invisible, and the structure
- **The arena** lives at `site/problems.html`; open problems, a public ledger, and a status ladder that keep trying visible without pretending an attempt is a proof
- **The hall** lives at `site/humans.html`; originator cards filterable by era and region, with a timeline from babylon to now

The book is one long calm page; every entry has a deep-linkable anchor. the first slice is euler's identity, phyllotaxis, and the lorenz attractor; the other twenty-one entries already have plates, sources, statements, intuitions, sliders, and a place in the sequence.

## The machinery

| language | place | what it does |
| --- | --- | --- |
| cue | `schemas/`, `data/` | holds the shapes of entries, problems, and attempts; typed and honest |
| julia | `scripts/` | computes the phyllotaxis points and the lorenz trajectory the pages render |
| rust | `referee/` | guards the arena ledger and the problem list with one small binary and no crates |
| html, css, js | `site/` | renders the static book with no framework, no runtime dependency, no cdn fetches |

The generated json is committed under `site/data/` because the deployed site is static; the source data in `data/` is the content layer, and `make compute` copies it and writes the computed fields.

## Run it

```sh
make compute
make check
make serve
```

`make compute` runs julia when julia is installed; a small python fallback keeps the build reproducible in a clean environment, and the julia scripts stay the technical source of the computed numbers. `make check` compiles the rust referee when `rustc` is available, and falls back to the same schema checks in python otherwise. the static output is `site/`, and that is what vercel deploys directly; `vercel.json` keeps the output directory explicit.

## The arena

The arena opens seeded with the millennium problems and a field-spread of open questions; riemann, p versus np, navier-stokes existence, birch and swinnerton-dyer, hodge, yang-mills mass gap, collatz, goldbach, twin primes, and more. the ladder is meant to grow toward two hundred entries, one problem per pull request, with a source attached.

An attempt records a name, a date, a problem id, a link, a claim, and a status. the status moves attempted → under review → verified, or withdrawn. anyone who tries gets listed; a solution earns the word verified only on a published peer-reviewed result or a checked formal proof. the example ledger row is deliberately only attempted.

## The margin

This margin is no longer too small. a short note can bring an alternative proof, an insight, a correction, or a connection. notes arrive by pull request, keep the author's name and date, and get curated into an entry. one visualization per pull request keeps the ladder climbable.

## The attribution creed

Contested histories get named as contested, and every originator gets praised where the mathematics has multiple roots; the indian and arabic mathematics carried through fibonacci, the babylonian and chinese precedents of the pythagorean theorem, lemaître beside hubble, faraday beside maxwell, weinberg beside hardy, and price beside bayes. the mac-tutor history of mathematics archive at st andrews is the citation backbone, with primary and problem sources attached in the data.

## Sister machines

The machines link where the mathematics is shared; `tide.jl` runs laplace's tides, `night.jl` runs kepler's sky, and `lumen.rs` keeps the color science honest. the book's take it home control copies a one-file implementation for a small experiment in julia or rust.

## The quiet rule

No formula dump, no dedicated page per formula, no silent claim, no borrowed visual identity, and no human left in the footnote.
