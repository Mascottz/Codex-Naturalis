# small machines; the checks. it exists to keep the arena honest without a runtime dependency.
# usage; python3 scripts/check.py

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "site" / "data"


def load(name):
    with (DATA / name).open(encoding="utf-8") as handle:
        return json.load(handle)


def fail(message):
    raise SystemExit(f"referee; {message}")


def main():
    entries = load("entries.json")
    problems = load("problems.json")
    attempts = load("attempts.json")
    if len(entries) != 24:
        fail(f"entries; expected 24, found {len(entries)}")
    if len(problems) > 200:
        fail("problems; more than 200 rows")
    ids = set()
    for entry in entries:
        for key in ("id", "number", "domain", "title", "formula", "originators", "year", "statement", "derivation", "intuition", "visualType", "source", "status"):
            if key not in entry:
                fail(f"entry {entry.get('id', 'unknown')}; missing {key}")
        if entry["id"] in ids:
            fail(f"entries; duplicate id {entry['id']}")
        ids.add(entry["id"])
        if entry["status"] not in ("live", "planned"):
            fail(f"entry {entry['id']}; invalid status")
    problem_ids = set()
    for problem in problems:
        for key in ("id", "number", "title", "field", "status", "millennium", "summary", "source"):
            if key not in problem:
                fail(f"problem {problem.get('id', 'unknown')}; missing {key}")
        if problem["id"] in problem_ids:
            fail(f"problems; duplicate id {problem['id']}")
        problem_ids.add(problem["id"])
        if problem["status"] not in ("open", "under review", "verified", "withdrawn"):
            fail(f"problem {problem['id']}; invalid status")
    attempt_ids = set()
    for attempt in attempts:
        for key in ("id", "name", "date", "problemId", "link", "status", "claim"):
            if key not in attempt:
                fail(f"attempt {attempt.get('id', 'unknown')}; missing {key}")
        if attempt["id"] in attempt_ids:
            fail(f"attempts; duplicate id {attempt['id']}")
        if attempt["problemId"] not in problem_ids:
            fail(f"attempt {attempt['id']}; unknown problem {attempt['problemId']}")
        if not re.match(r"^https?://", attempt["link"]):
            fail(f"attempt {attempt['id']}; link must be http")
        if attempt["status"] not in ("attempted", "under review", "verified", "withdrawn"):
            fail(f"attempt {attempt['id']}; invalid status")
        attempt_ids.add(attempt["id"])
    phyllotaxis = load("phyllotaxis.json")
    if len(phyllotaxis.get("points", [])) != 220:
        fail("phyllotaxis; computed point count is not 220")
    lorenz = load("lorenz.json")
    if len(lorenz.get("points", [])) != 900:
        fail("lorenz; computed point count is not 900")
    if max(abs(point[0]) for point in lorenz["points"]) < 1:
        fail("lorenz; trajectory did not move")
    print(f"night; the checks hold; {len(entries)} entries, {len(problems)} problems, {len(attempts)} attempts")


if __name__ == "__main__":
    main()
