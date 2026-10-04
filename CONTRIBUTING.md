# Contributing to Codex Naturalis

Contributions follow two small review paths: book plates and arena submissions. Keep each change narrow enough to review and complete enough to trust.

## The book ladder

One visualization per pull request keeps the book from becoming a formula dump.

- **Choose one entry.** Use an existing deep-linkable id or propose a plate that is not in the book yet.
- **Write both readings.** Include a rigorous statement or derivation sketch and a plain-language intuition. Keep open questions distinct from established results.
- **Attach originators.** Add every person whose work belongs in the story, with a human card, era, region, role, and source. Name contested history as contested.
- **Compute the picture.** Put mathematical numerical work in a Julia script and generated output in `site/data/`. Add an invariant or a check when one exists.
- **Keep the machine small.** Keep the take-it-home copy to one readable file. Use Julia for computed mathematics; use Rust for a small referee or self-contained tool.
- **Run the gate.** Run `make compute` and `make check` before opening a pull request.

The MacTutor History of Mathematics archive at St Andrews is the citation backbone. Cite primary papers, the Clay Mathematics Institute, and other direct sources where they carry the result or history. Give every formula a source line.

## The arena ladder

One problem or one attempt per pull request keeps the public ledger legible.

- **Add one problem.** Put new problems in `data/problems.json` with an id, field, status, summary, and source. Keep the list below 200 entries.
- **Record the attempt.** Include a contributor name, ISO date, problem id, link, status, exact claim, and optional solution file under `solutions/{problem-id}/`.
- **Keep the status honest.** Move submissions through `attempted` → `under review` → `verified`, or mark them `withdrawn`. Credit attempts without presenting them as proofs.
- **Reserve verified.** Use `verified` for a published peer-reviewed result or a checked formal proof. Do not promote a computation, an unchecked preprint, or an issue comment on its own.
- **Publish the solution.** Write proofs in Markdown. Keep each computational witness to one Julia or Rust source file with its exact rerun command and recorded output. Keep verified house solutions on their problem pages and add them to the closed pages.
- **Run the referee.** Run `make check` to validate the ledger, referenced solution files, and file shapes. CI compiles and runs the no-crate Rust referee.

## Files and machinery

- `data/` holds the content layer and canonical JSON mirrors for static generation.
- `schemas/` holds the CUE shapes for entries, problems, attempts, and closed pages.
- `solutions/{problem-id}/` holds permanent proofs and computational witnesses attached to ledger entries.
- `scripts/` holds the Julia machines, local fallback, and checks.
- `referee/` holds the Rust arena gate.
- `site/` holds the static pages and generated data served by Vercel.
- `Makefile` stages generated data and solutions, runs available local checks, and serves the preview.

## The writing voice

Use first person only for the book's reflections, hero copy, margins, and attribution notes. Keep exposition neutral and declarative. Write instructions in the imperative. Capitalize the first word of every heading, paragraph, and bullet. Avoid second-person phrasing, em dashes, and emojis. Keep source, work, and attribution visible.

## The pull request checklist

- [ ] Choose one visualization, note, problem, or attempt for the pull request.
- [ ] Cite MacTutor or explain why another primary source carries the history.
- [ ] Add a human card for every originator and name each one in the relevant entry.
- [ ] Include both a rigorous reading and an intuition.
- [ ] Derive computed numbers from the Julia machine or cite an exact source.
- [ ] Keep the arena status aligned with the evidence and link the attempt.
- [ ] Run `make compute` and `make check`.
