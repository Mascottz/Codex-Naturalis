# Codex Naturalis

Galileo wrote that the book of nature is written in mathematics. Codex Naturalis is a living copy of that book, with thirty interactive plates spanning the sky, the earth, the living world, the invisible, and mathematical structure. Every entry keeps its rigorous statement, a reading of its intuition, source links, and the people who shaped it.

The site is static, dependency-free, and built from typed data. Julia computes the fields shown in the plates, Cue holds the data to its schemas, and a small Rust referee guards the public arena ledger.

## The pages

- **The book** lives at `site/index.html`; thirty plates, grouped into five domains.
- **The solving desk** lives at `site/solve.html`; a die or a legal Rubik's-cube scramble selects from every problem marked open. Direct links use `solve.html?problem=problem-id`.
- **The arena** lives at `site/problems.html`; open questions, seven house challenges, named attempts, and the verification ladder.
- **The hall** lives at `site/humans.html`; originator cards filter by era and region, with a chronological line from Babylon to the present.
- **The toys** live at `site/toys.html`; Buffon, Galton, the chaos game, and Hilbert's hotel, each linked back to a plate.
- **The closed pages** live at `site/solved.html`; twelve resolved problems with solver names, dates, sources, and verification notes.

Each book entry has a deep-linkable anchor. The visual plates include Euler's identity, phyllotaxis, the Lorenz attractor, galaxy rotation curves, the three-body figure eight, the Jeans mass, the Eddington luminosity, the Schechter luminosity function, and the Rubik's-cube group. Small native canvas and HTML toys use no external runtime or fetched assets.

## The machinery

| Language | Place | Purpose |
| --- | --- | --- |
| Cue | `schemas/`, `data/` | Defines the shapes of entries, problems, attempts, the solving desk, and closed pages. |
| Julia | `scripts/` | Computes phyllotaxis and Lorenz fields, galaxy rotation curves, the perturbed three-body trajectories, the Jeans grid, Eddington luminosities, and Schechter curves. |
| Rust | `referee/` | Checks the arena ledger, open-problem desk map, computed data, and published solution files without external crates. |
| HTML, CSS, JavaScript | `site/` | Renders the static book, solving desk, toy shelf, and public ledgers without a framework or CDN fetch. |

The generated JSON is committed under `site/data/` because deployment is static. Source data in `data/` is the content layer; `make compute` copies it, runs the Julia machines or a Python fallback, and stages scripts and solutions under `site/`.

## Run it

```sh
make compute
make check
make serve
```

`make compute` runs Julia when it is installed. A small Python fallback keeps the build reproducible in a clean environment, while the Julia scripts remain the computational source. `make check` compiles the Rust referee when `rustc` is available and otherwise runs equivalent Python checks. The static output is `site/`, which is the deployment directory in `vercel.json`.

## The arena

The arena opens with millennium problems, a field-spread of world questions, and seven house challenges. C6 asks for the total-variation horizon of a lazy Rubik's-cube walk. C7 asks for global uniqueness of the equal-mass figure-eight minimizer within a stated symmetry class. Every house problem follows the existing retirement rule: if prior work solved it, the source is recorded and the challenge retires with honors.

The solving desk is static. Its form composes a GitHub issue with the contributor's name, date, problem id, one-line claim, and work link; the site does not receive submissions. An attempt appears in the ledger only after its ledger pull request is reviewed and merged. The status ladder is Attempted, Under review, Verified, or Withdrawn. Verification requires a published peer-reviewed result or a checked formal proof. Proofs live as Markdown under `solutions/{problem-id}/`; computational witnesses are one Julia or Rust file with an exact rerun command and recorded output.

## The margin

The margin welcomes an alternative proof, an insight, a correction, or a connection. Notes arrive by pull request, keep the author's name and date, and are curated into an entry. One visualization per pull request keeps the ladder climbable.

## The attribution creed

Contested histories are named as contested, and every originator is credited where the mathematics has multiple roots. The book pairs Indian and Arabic arithmetic with Fibonacci, Babylonian and Chinese precedents with the Pythagorean theorem, Lemaître with Hubble, Faraday with Maxwell, and Price with Bayes. The MacTutor History of Mathematics archive at St Andrews anchors the historical record, with primary research and problem sources attached in the data.

## Sister machines

The machines link where the mathematics is shared: `tide.jl` runs Laplace's tides, `night.jl` runs Kepler's sky, and `lumen.rs` keeps color science honest. The book's take-home control copies the exact rerun command for each new Julia machine.

## The quiet rule

No formula dump, no dedicated page per formula, no silent claim, no borrowed visual identity, and no human left in the footnote.
