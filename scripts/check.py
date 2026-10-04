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


def validate_sources(sources, context, allow_internal=False):
    for source in sources:
        require_fields(source, ("title", "url"), f"{context} source")
        url = source["url"]
        if not re.match(r"^https?://", url) and not (allow_internal and url.startswith("index.html#")):
            fail(f"{context}; source URL is invalid: {url}")


def validate_machine(machine, context):
    require_fields(machine, ("title", "path", "command", "description"), f"{context} machine")
    path_text = machine["path"]
    if not path_text.startswith("scripts/") or ".." in Path(path_text).parts or "\\" in path_text or not path_text.endswith(".jl"):
        fail(f"{context}; unsafe machine path {path_text}")
    if machine["command"] != f"julia {path_text}":
        fail(f"{context}; exact rerun command must be `julia {path_text}`")
    if not (ROOT / path_text).is_file():
        fail(f"{context}; machine source is missing: {path_text}")
    served = ROOT / "site" / "machines" / Path(path_text).name
    if not served.is_file() or served.read_text(encoding="utf-8") != (ROOT / path_text).read_text(encoding="utf-8"):
        fail(f"{context}; static machine source is missing or stale: {path_text}")


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
    desk = load("desk.json")

    if len(entries) != 30:
        fail(f"entries; expected 30, found {len(entries)}")
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
        if entry.get("sources"):
            validate_sources(entry["sources"], f"entry {entry['id']}", allow_internal=True)
        if entry.get("machine"):
            validate_machine(entry["machine"], f"entry {entry['id']}")
        controls = entry.get("controls", [entry.get("slider")] if entry.get("slider") else [])
        for control in controls:
            require_fields(control, ("label", "min", "max", "step", "value"), f"entry {entry['id']} control")
            if control["step"] <= 0 or control["min"] > control["value"] or control["value"] > control["max"]:
                fail(f"entry {entry['id']}; invalid control range")

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
    open_ids = set()
    for problem in problems:
        require_fields(problem, ("id", "number", "title", "field", "status", "millennium", "summary", "source"), "problem")
        if problem["id"] in problem_ids:
            fail(f"problems; duplicate id {problem['id']}")
        problem_ids.add(problem["id"])
        if problem["status"] not in {"open", "under review", "verified", "withdrawn"}:
            fail(f"problem {problem['id']}; invalid status")
        if problem["status"] == "open":
            open_ids.add(problem["id"])
            if not problem.get("statement", "").strip():
                fail(f"problem {problem['id']}; open questions need a complete statement")
        if problem.get("sources"):
            validate_sources(problem["sources"], f"problem {problem['id']}")
        if problem["summary"].lower().startswith("i ask whether"):
            fail(f"problem {problem['id']}; the question must speak in its own voice")
        if problem.get("kind") == "codex":
            require_fields(problem, ("label", "statement", "problemType", "approach"), "house problem")
            house_ids.add(problem["id"])
    if len(house_ids) != 7:
        fail(f"house problems; expected seven, found {len(house_ids)}")

    desk_ids = set()
    for record in desk:
        require_fields(record, ("problemId", "definitions", "relatedEntries", "machines"), "desk record")
        problem_id = record["problemId"]
        if problem_id not in open_ids:
            fail(f"desk; {problem_id} is not an open problem")
        if problem_id in desk_ids:
            fail(f"desk; duplicate problem record {problem_id}")
        desk_ids.add(problem_id)
        if not all(isinstance(record[key], list) for key in ("definitions", "relatedEntries", "machines")):
            fail(f"desk; definitions, relatedEntries, and machines must be arrays for {problem_id}")
        related = set(record["relatedEntries"])
        if not related.issubset(entry_ids):
            fail(f"desk; {problem_id} references an unknown book entry")
        for definition in record["definitions"]:
            require_fields(definition, ("term", "explanation", "entryId"), f"desk {problem_id} definition")
            if definition["entryId"] not in related:
                fail(f"desk; {problem_id} definition is not attached to a related plate")
        for machine in record["machines"]:
            validate_machine(machine, f"desk {problem_id}")
    if desk_ids != open_ids:
        missing = sorted(open_ids - desk_ids)
        fail(f"desk; every open problem needs a record; missing {', '.join(missing)}")

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
    galaxy = load("galaxy-rotation.json")
    if not (len(galaxy.get("radiiKpc", [])) == len(galaxy.get("visibleKms", [])) == len(galaxy.get("haloIncludedKms", [])) == 80):
        fail("galaxy rotation; computed curves must share 80 radii")
    if galaxy["haloIncludedKms"][-1] <= galaxy["visibleKms"][-1]:
        fail("galaxy rotation; halo must support the outer curve")
    three_body = load("three-body.json")
    if len(three_body.get("scenarios", [])) != 5 or any(len(item.get("positions", [])) != 301 for item in three_body["scenarios"]):
        fail("three-body; expected five Julia-integrated 301-frame trajectories")
    if any(len(frame) != 3 for item in three_body["scenarios"] for frame in item["positions"]):
        fail("three-body; every frame must contain three bodies")
    jeans = load("jeans-mass.json")
    if len(jeans.get("temperatureKelvin", [])) != 10 or len(jeans.get("log10NumberDensity", [])) != 81 or any(len(row) != 81 for row in jeans.get("solarMasses", [])):
        fail("Jeans mass; computed temperature-density grid has the wrong shape")
    eddington = load("eddington.json")
    if len(eddington.get("massSolar", [])) != 100 or len(eddington.get("luminosityErgPerSecond", [])) != 100:
        fail("Eddington; computed mass-luminosity grid has the wrong shape")
    schechter = load("schechter.json")
    if len(schechter.get("alpha", [])) != 15 or len(schechter.get("luminosityOverLstar", [])) != 121 or any(len(row) != 121 for row in schechter.get("phiOverPhiStar", [])):
        fail("Schechter; computed slope-luminosity grid has the wrong shape")

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
