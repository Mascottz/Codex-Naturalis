# Contributing to codex naturalis

I want the ladder to feel climbable. A contribution can be a formula plate, an originator card, a careful note, an open problem, or an attempt in the arena. I keep the process small enough to finish and strict enough to trust.

## The book ladder

One visualization per pull request keeps the book from becoming a formula dump.

- **Choose one entry.** I use an existing deep-linkable id or propose one of the remaining plates.
- **Write both readings.** I include a rigorous statement or derivation sketch and a plain-language intuition. I do not hide an open question inside a confident paragraph.
- **Attach originators.** I add every person whose work belongs in the story, a human card, an era, a region, a role, and a source. Contested history stays named as contested.
- **Compute the picture.** I put numerical work in a Julia script when the work is mathematical and generated output in `site/data/`. A visualization carries an invariant or a check when one exists.
- **Give it a small machine.** The take it home copy stays one file and readable. Julia fits computed mathematics; Rust fits a small referee or a self-contained tool.
- **Run the gate.** `make compute` and `make check` must hold before the pull request arrives.

The MacTutor History of Mathematics archive at St Andrews is the citation backbone. Primary papers, the Clay Mathematics Institute, and other direct sources can sit beside it. A formula gets a source line, not just a name.

## The arena ladder

One problem or one attempt per pull request keeps the public ledger legible.

- **Choose one row.** New problems go in `data/problems.json`, with an id, field, status, summary, and source. The list grows toward 200.
- **Name the attempt.** An attempt records a name, ISO date, problem id, link, status, exact claim, and optional solution file under `solutions/{problem-id}/`.
- **Keep the status honest.** The path is `attempted` → `under review` → `verified`, or `withdrawn`. Anyone can be listed as an attemptor for trying.
- **Reserve verified.** A published peer-reviewed result or a checked formal proof counts as verified. A computation, a preprint without the required check, or a confident issue comment does not silently cross that line.
- **Use the template.** `.github/PULL_REQUEST_TEMPLATE/problem-or-attempt.md` asks for the claim, link, name, date, and status.
- **Publish the solution.** Proofs are Markdown; computational witnesses are one Julia or Rust source file with an exact rerun command and output. A verified house solution stays on the problem page and joins the closed pages.
- **Run the referee.** `make check` runs the no-crate Rust referee in CI and validates the ledger, referenced solution files, and each file's shape before a merge.

## The files

- `data/` holds the content layer and the canonical JSON mirrors for static generation.
- `schemas/` holds the CUE shapes for entries, problems, attempts, and closed pages.
- `solutions/{problem-id}/` holds the permanent proof or computational witness attached to a ledger entry.
- `scripts/` holds small Julia machines and the local fallback and checks.
- `referee/` holds the Rust arena gate.
- `site/` is the static page that Vercel serves.

## The writing voice

I write casually and directly. I capitalize the first word of a heading, paragraph, or bullet and keep the rest lowercase-casual. I use semicolons or arrows where a long dash might appear. I do not use emojis. I do not write a second-person instruction into an entry, and I do not turn a mathematician into a distant third-person summary. The name, the work, the source, and the human card do the talking.

## The pull request checklist

- [ ] One visualization, one note, one problem, or one attempt is clear in the title.
- [ ] The source cites MacTutor or explains why another primary source carries the history.
- [ ] Every originator has a card and appears in the relevant entry.
- [ ] The rigorous reading and the intuition both fit the entry.
- [ ] Computed numbers come from the Julia machine or an explained exact source.
- [ ] The arena status is honest and the attempt link works.
- [ ] `make check` passes.
