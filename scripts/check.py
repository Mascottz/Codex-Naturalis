# small machines; the checks. it keeps the generated pages and the public ledger honest.
# usage; python3 scripts/check.py

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "site" / "data"
ALLOWED_STATUSES = {"attempted", "under review", "verified", "withdrawn"}


def load(name):
    with (DATA / name).open(encoding="utf-8") as handle:
        return json.load(handle)


def fail(message):
    raise SystemExit(f"referee; {message}")


def require_fields(row, fields, kind):
    for field in fields:
        if field not in row:
            fail(f"{kind} {row.get('id', 'unknown')}; missing {field}")


def validate_solution(attempt):
    path_text = attempt.get("solutionPath")
    if not path_text:
        if any(key in attempt for key in ("solutionType", "command", "output")):
            fail(f"attempt {attempt['id']}; solution metadata has no solutionPath")
        if attempt["status"] == "verified":
            fail(f"attempt {attempt['id']}; a verified solution needs a published file")
        return None

    expected_prefix = f"solutions/{attempt['problemId']}/"
    if not path_text.startswith(expected_prefix) or ".." in Path(path_text).parts or "\\" in path_text:
        fail(f"attempt {attempt['id']}; solution must live under {expected_prefix}")
    solution_type = attempt.get("solutionType")
    extensions = {"proof": ".md", "julia": ".jl", "rust": ".rs"}
    if solution_type not in extensions:
        fail(f"attempt {attempt['id']}; invalid solutionType")
    solution_path = ROOT / path_text
    if solution_path.suffix != extensions[solution_type]:
        fail(f"attempt {attempt['id']}; expected {extensions[solution_type]} for {solution_type}")
    if not solution_path.is_file():
        fail(f"attempt {attempt['id']}; missing solution file {path_text}")
    contents = solution_path.read_text(encoding="utf-8")
    served_path = ROOT / "site" / path_text
    if not served_path.is_file() or served_path.read_text(encoding="utf-8") != contents:
        fail(f"attempt {attempt['id']}; static solution copy is missing or stale")
    if not contents.strip():
        fail(f"attempt {attempt['id']}; solution file is empty")
    if solution_type == "proof" and not any(line.lstrip().startswith("#") for line in contents.splitlines()):
        fail(f"attempt {attempt['id']}; markdown proof needs a heading")
    if solution_type in {"julia", "rust"}:
        command = attempt.get("command", "")
        if solution_type == "julia" and not command.startswith("julia "):
            fail(f"attempt {attempt['id']}; command must run the Julia witness")
        if solution_type == "rust" and not (command.startswith("rustc ") or command.startswith("cargo run ")):
            fail(f"attempt {attempt['id']}; command must run the Rust witness")
        if attempt["status"] == "verified" and not attempt.get("output", "").strip():
            fail(f"attempt {attempt['id']}; verified computation needs recorded output")
    if attempt["status"] == "verified" and not attempt.get("verification", "").strip():
        fail(f"attempt {attempt['id']}; a verified solution needs its verification stamp")
    return path_text


def main():
    entries = load("entries.json")
    humans = load("humans.json")
    problems = load("problems.json")
    attempts = load("attempts.json")
    solved = load("solved.json")

    if len(entries) != 24:
        fail(f"entries; expected 24, found {len(entries)}")
    if len(problems) > 200:
        fail("problems; more than 200 rows")
    if len(solved) != 12:
        fail(f"solved; expected 12 closed pages, found {len(solved)}")

    human_ids = {human["id"] for human in humans}
    if len(human_ids) != len(humans):
        fail("humans; duplicate id")
    entry_ids = set()
    for entry in entries:
        require_fields(entry, ("id", "number", "domain", "title", "formula", "originators", "year", "statement", "derivation", "intuition", "visualType", "source", "status"), "entry")
        if entry["id"] in entry_ids:
            fail(f"entries; duplicate id {entry['id']}")
        entry_ids.add(entry["id"])
        if entry["status"] not in ("live", "planned"):
            fail(f"entry {entry['id']}; invalid status")
        for originator in entry["originators"]:
            if originator not in human_ids:
                fail(f"entry {entry['id']}; unknown originator {originator}")

    for human in humans:
        if not human.get("note", "").startswith("I "):
            fail(f"human {human['id']}; note needs the book's first-person voice")
        for entry_id in human.get("entryIds", []):
            if entry_id not in entry_ids:
                fail(f"human {human['id']}; unknown entry {entry_id}")
        for solved_id in human.get("solvedIds", []):
            if solved_id not in {row["id"] for row in solved}:
                fail(f"human {human['id']}; unknown closed page {solved_id}")

    problem_ids = set()
    house_ids = set()
    for problem in problems:
        require_fields(problem, ("id", "number", "title", "field", "status", "millennium", "summary", "source"), "problem")
        if problem["id"] in problem_ids:
            fail(f"problems; duplicate id {problem['id']}")
        problem_ids.add(problem["id"])
        if problem["status"] not in {"open", "under review", "verified", "withdrawn"}:
            fail(f"problem {problem['id']}; invalid status")
        if problem["summary"].lower().startswith("i ask whether"):
            fail(f"problem {problem['id']}; the question must speak in its own voice")
        if problem.get("kind") == "codex":
            require_fields(problem, ("label", "statement", "problemType", "approach"), "house problem")
            house_ids.add(problem["id"])
    if len(house_ids) != 5:
        fail(f"house problems; expected five, found {len(house_ids)}")

    attempt_ids = set()
    solution_paths = set()
    for attempt in attempts:
        require_fields(attempt, ("id", "name", "date", "problemId", "link", "status", "claim"), "attempt")
        if attempt["id"] in attempt_ids:
            fail(f"attempts; duplicate id {attempt['id']}")
        attempt_ids.add(attempt["id"])
        if attempt["problemId"] not in problem_ids:
            fail(f"attempt {attempt['id']}; unknown problem {attempt['problemId']}")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", attempt["date"]):
            fail(f"attempt {attempt['id']}; date must be ISO")
        if not re.match(r"^https?://", attempt["link"]):
            fail(f"attempt {attempt['id']}; link must be http")
        if attempt["status"] not in ALLOWED_STATUSES:
            fail(f"attempt {attempt['id']}; invalid status")
        solution_path = validate_solution(attempt)
        if solution_path:
            if solution_path in solution_paths:
                fail(f"attempts; duplicate solution path {solution_path}")
            solution_paths.add(solution_path)

    for path in (ROOT / "solutions").rglob("*"):
        if path.is_file():
            relative = path.relative_to(ROOT).as_posix()
            if relative not in solution_paths:
                fail(f"solutions; unledgered file {relative}")

    solved_ids = set()
    for page in solved:
        require_fields(page, ("id", "number", "title", "year", "solvers", "verificationType", "verification", "source"), "solved page")
        if page["id"] in solved_ids:
            fail(f"solved; duplicate id {page['id']}")
        solved_ids.add(page["id"])
        if not page["verification"].strip():
            fail(f"solved page {page['id']}; verification line is empty")
        for solver in page["solvers"]:
            if "humanId" in solver and solver["humanId"] not in human_ids:
                fail(f"solved page {page['id']}; unknown solver card {solver['humanId']}")

    phyllotaxis = load("phyllotaxis.json")
    if len(phyllotaxis.get("points", [])) != 220:
        fail("phyllotaxis; computed point count is not 220")
    lorenz = load("lorenz.json")
    if len(lorenz.get("points", [])) != 900:
        fail("lorenz; computed point count is not 900")
    if max(abs(point[0]) for point in lorenz["points"]) < 1:
        fail("lorenz; trajectory did not move")

    source_root = ROOT / "site"
    for path in source_root.rglob("*"):
        if path.is_file() and path.suffix in {".html", ".js", ".json", ".md"}:
            text = path.read_text(encoding="utf-8")
            if ("codex-naturalis" + "-") in text:
                fail(f"site source {path.relative_to(ROOT)}; stale repository slug")
            if (("hub" + "blem") + "-lemaitre") in text:
                fail(f"site source {path.relative_to(ROOT)}; stale Hubble-Lemaître anchor")

    # This ordering guard protects the historical line from a row-order regression.
    years = {human["id"]: int(re.search(r"\d{3,4}", human["years"]).group()) for human in humans if re.search(r"\d{3,4}", human["years"])}
    if years.get("pierre-simon-laplace", 9999) >= years.get("edwin-hubble", -1):
        fail("timeline; Laplace must precede Hubble")

    print(f"night; the checks hold; {len(entries)} entries, {len(problems)} problems, {len(attempts)} attempts, {len(solved)} closed pages, {len(solution_paths)} solution files")


if __name__ == "__main__":
    main()
