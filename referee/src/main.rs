// small machines; referee. the arena gate. one file, no crates; it keeps the published ledger legible.
// usage; codex-referee site/data .

use std::collections::HashSet;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

fn person_error(message: &str) -> ! {
    eprintln!("referee; {}", message);
    std::process::exit(1);
}

fn read_file(root: &Path, name: &str) -> String {
    let path = root.join(name);
    fs::read_to_string(&path).unwrap_or_else(|_| person_error(&format!("could not read {}", path.display())))
}

fn objects(document: &str) -> Vec<&str> {
    let mut found = Vec::new();
    let mut start = None;
    let mut depth = 0usize;
    let mut quoted = false;
    let mut escaped = false;
    for (index, character) in document.char_indices() {
        if quoted {
            if escaped {
                escaped = false;
            } else if character == '\\' {
                escaped = true;
            } else if character == '"' {
                quoted = false;
            }
            continue;
        }
        match character {
            '"' => quoted = true,
            '{' => {
                if depth == 0 {
                    start = Some(index);
                }
                depth += 1;
            }
            '}' => {
                if depth == 0 {
                    person_error("json; unmatched closing brace");
                }
                depth -= 1;
                if depth == 0 {
                    if let Some(begin) = start {
                        found.push(&document[begin..=index]);
                    }
                    start = None;
                }
            }
            _ => {}
        }
    }
    if depth != 0 || quoted {
        person_error("json; unfinished object or string");
    }
    found
}

fn has_key(object: &str, key: &str) -> bool {
    object.contains(&format!("\"{}\":", key))
}

fn value(object: &str, key: &str) -> Option<String> {
    let marker = format!("\"{}\":", key);
    let start = object.find(&marker)? + marker.len();
    let rest = object[start..].trim_start();
    if !rest.starts_with('"') {
        return None;
    }
    let mut escaped = false;
    for (offset, character) in rest[1..].char_indices() {
        if escaped {
            escaped = false;
        } else if character == '\\' {
            escaped = true;
        } else if character == '"' {
            return Some(rest[1..1 + offset].to_string());
        }
    }
    None
}

fn require_keys(object: &str, kind: &str, keys: &[&str]) {
    for key in keys {
        if !has_key(object, key) {
            person_error(&format!("{}; missing {}", kind, key));
        }
    }
}

fn is_iso_date(date: &str) -> bool {
    let bytes = date.as_bytes();
    bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes.iter().enumerate().all(|(index, byte)| index == 4 || index == 7 || byte.is_ascii_digit())
}

fn check_entries(document: &str) -> HashSet<String> {
    if !document.trim_start().starts_with('[') {
        person_error("entries; expected an array");
    }
    let rows = objects(document);
    if rows.len() != 24 {
        person_error(&format!("entries; expected 24 rows, found {}", rows.len()));
    }
    let mut ids = HashSet::new();
    for row in &rows {
        require_keys(row, "entry", &["id", "number", "domain", "title", "formula", "originators", "year", "statement", "derivation", "intuition", "visualType", "source", "status"]);
        let id = value(row, "id").unwrap_or_else(|| person_error("entry; id must be a string"));
        if !ids.insert(id.clone()) {
            person_error(&format!("entries; duplicate id {}", id));
        }
        let status = value(row, "status").unwrap_or_else(|| person_error(&format!("entry {}; status must be a string", id)));
        if status != "live" && status != "planned" {
            person_error(&format!("entry {}; status is not live or planned", id));
        }
    }
    ids
}

fn check_problems(document: &str) -> (usize, HashSet<String>, HashSet<String>) {
    if !document.trim_start().starts_with('[') {
        person_error("problems; expected an array");
    }
    let rows = objects(document);
    if rows.len() > 200 {
        person_error("problems; more than 200 rows");
    }
    let mut ids = HashSet::new();
    let mut house_ids = HashSet::new();
    for row in &rows {
        require_keys(row, "problem", &["id", "number", "title", "field", "status", "millennium", "summary", "source"]);
        let id = value(row, "id").unwrap_or_else(|| person_error("problem; id must be a string"));
        if !ids.insert(id.clone()) {
            person_error(&format!("problems; duplicate id {}", id));
        }
        let status = value(row, "status").unwrap_or_else(|| person_error(&format!("problem {}; status must be a string", id)));
        let statuses = ["open", "under review", "verified", "withdrawn"];
        if !statuses.contains(&status.as_str()) {
            person_error(&format!("problem {}; status is not on the ladder", id));
        }
        if value(row, "kind").as_deref() == Some("codex") {
            require_keys(row, "house problem", &["label", "statement", "problemType", "approach"]);
            house_ids.insert(id);
        }
        let summary = value(row, "summary").unwrap_or_default().to_lowercase();
        if summary.starts_with("i ask whether") {
            person_error("problem; world questions must speak in their own voice");
        }
    }
    if house_ids.len() != 5 {
        person_error(&format!("house problems; expected five, found {}", house_ids.len()));
    }
    (rows.len(), ids, house_ids)
}

fn check_solution_file(repo_root: &Path, path_text: &str, kind: &str, status: &str, command: Option<&str>, output: Option<&str>) {
    if !path_text.starts_with("solutions/") || path_text.contains("..") || path_text.contains('\\') {
        person_error(&format!("solution; unsafe path {}", path_text));
    }
    let extension = Path::new(path_text).extension().and_then(|part| part.to_str()).unwrap_or("");
    let expected_extension = match kind {
        "proof" => "md",
        "julia" => "jl",
        "rust" => "rs",
        _ => person_error(&format!("solution {}; unknown type {}", path_text, kind)),
    };
    if extension != expected_extension {
        person_error(&format!("solution {}; expected .{} for {}", path_text, expected_extension, kind));
    }
    let disk_path = repo_root.join(path_text);
    let contents = fs::read_to_string(&disk_path).unwrap_or_else(|_| person_error(&format!("solution; could not read {}", disk_path.display())));
    let served_path = repo_root.join("site").join(path_text);
    let served_contents = fs::read_to_string(&served_path).unwrap_or_else(|_| person_error(&format!("solution; static copy is missing at {}", served_path.display())));
    if contents != served_contents {
        person_error(&format!("solution {}; static copy does not match the ledger source", path_text));
    }
    if contents.trim().is_empty() {
        person_error(&format!("solution {}; file is empty", path_text));
    }
    if kind == "proof" && !contents.lines().any(|line| line.trim_start().starts_with('#')) {
        person_error(&format!("solution {}; markdown proof needs a heading", path_text));
    }
    if kind == "julia" || kind == "rust" {
        let exact_command = command.unwrap_or_else(|| person_error(&format!("solution {}; computational witness needs an exact command", path_text)));
        let command_ok = if kind == "julia" {
            exact_command.starts_with("julia ")
        } else {
            exact_command.starts_with("rustc ") || exact_command.starts_with("cargo run ")
        };
        if !command_ok {
            person_error(&format!("solution {}; command does not run the declared source", path_text));
        }
        if status == "verified" && output.unwrap_or("").trim().is_empty() {
            person_error(&format!("solution {}; verified computation needs recorded output", path_text));
        }
    }
}

fn check_attempts(document: &str, problem_ids: &HashSet<String>, repo_root: &Path) -> (usize, HashSet<String>) {
    if !document.trim_start().starts_with('[') {
        person_error("attempts; expected an array");
    }
    let rows = objects(document);
    let mut ids = HashSet::new();
    let mut solution_paths = HashSet::new();
    for row in &rows {
        require_keys(row, "attempt", &["id", "name", "date", "problemId", "link", "status", "claim"]);
        let id = value(row, "id").unwrap_or_else(|| person_error("attempt; id must be a string"));
        if !ids.insert(id.clone()) {
            person_error(&format!("attempts; duplicate id {}", id));
        }
        let problem = value(row, "problemId").unwrap_or_else(|| person_error(&format!("attempt {}; problemId must be a string", id)));
        if !problem_ids.contains(&problem) {
            person_error(&format!("attempt {}; unknown problem {}", id, problem));
        }
        let link = value(row, "link").unwrap_or_else(|| person_error(&format!("attempt {}; link must be a string", id)));
        if !link.starts_with("http://") && !link.starts_with("https://") {
            person_error(&format!("attempt {}; link must be http", id));
        }
        let date = value(row, "date").unwrap_or_else(|| person_error(&format!("attempt {}; date must be a string", id)));
        if !is_iso_date(&date) {
            person_error(&format!("attempt {}; date must be an ISO date", id));
        }
        let status = value(row, "status").unwrap_or_else(|| person_error(&format!("attempt {}; status must be a string", id)));
        if !["attempted", "under review", "verified", "withdrawn"].contains(&status.as_str()) {
            person_error(&format!("attempt {}; status is not on the ladder", id));
        }
        let path = value(row, "solutionPath");
        if status == "verified" && path.is_none() {
            person_error(&format!("attempt {}; a verified solution needs a published file", id));
        }
        if let Some(path_text) = path {
            let expected_prefix = format!("solutions/{}/", problem);
            if !path_text.starts_with(&expected_prefix) {
                person_error(&format!("attempt {}; solution must live under {}", id, expected_prefix));
            }
            let kind = value(row, "solutionType").unwrap_or_else(|| person_error(&format!("attempt {}; solutionPath needs solutionType", id)));
            let command = value(row, "command");
            let output = value(row, "output");
            if status == "verified" && value(row, "verification").unwrap_or_default().trim().is_empty() {
                person_error(&format!("attempt {}; a verified solution needs its verification stamp", id));
            }
            check_solution_file(repo_root, &path_text, &kind, &status, command.as_deref(), output.as_deref());
            if !solution_paths.insert(path_text.clone()) {
                person_error(&format!("attempts; solution file {} is listed more than once", path_text));
            }
        } else if value(row, "solutionType").is_some() || value(row, "command").is_some() || value(row, "output").is_some() {
            person_error(&format!("attempt {}; solution metadata has no solutionPath", id));
        }
    }
    (rows.len(), solution_paths)
}

fn collect_files(directory: &Path, prefix: &str, files: &mut Vec<String>) {
    let entries = fs::read_dir(directory).unwrap_or_else(|_| person_error(&format!("solutions; could not list {}", directory.display())));
    for entry in entries {
        let entry = entry.unwrap_or_else(|_| person_error("solutions; could not read directory entry"));
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let relative = if prefix.is_empty() { name.clone() } else { format!("{}/{}", prefix, name) };
        if path.is_dir() {
            collect_files(&path, &relative, files);
        } else if path.is_file() {
            files.push(format!("solutions/{}", relative));
        }
    }
}

fn check_solutions_directory(repo_root: &Path, referenced: &HashSet<String>) {
    let directory = repo_root.join("solutions");
    if !directory.exists() {
        if referenced.is_empty() {
            return;
        }
        person_error("solutions; directory is missing");
    }
    let mut files = Vec::new();
    collect_files(&directory, "", &mut files);
    for path in files {
        if !referenced.contains(&path) {
            person_error(&format!("solutions; unledgered file {}", path));
        }
    }
}

fn check_solved(document: &str) -> usize {
    if !document.trim_start().starts_with('[') {
        person_error("solved; expected an array");
    }
    let rows = objects(document);
    if rows.len() != 12 {
        person_error(&format!("solved; expected 12 closed pages, found {}", rows.len()));
    }
    let mut ids = HashSet::new();
    for row in &rows {
        require_keys(row, "solved page", &["id", "number", "title", "year", "solvers", "verificationType", "verification", "source"]);
        let id = value(row, "id").unwrap_or_else(|| person_error("solved page; id must be a string"));
        if !ids.insert(id.clone()) {
            person_error(&format!("solved; duplicate id {}", id));
        }
        let verification = value(row, "verification").unwrap_or_default();
        if verification.trim().is_empty() {
            person_error(&format!("solved page {}; verification line is empty", id));
        }
        let source = value(row, "source").unwrap_or_default();
        if !source.starts_with("http://") && !source.starts_with("https://") {
            person_error(&format!("solved page {}; source must be http", id));
        }
    }
    rows.len()
}

fn check_computed_data(root: &Path) {
    let phyllotaxis = read_file(root, "phyllotaxis.json");
    let lorenz = read_file(root, "lorenz.json");
    if !phyllotaxis.contains("\"points\":[") || !lorenz.contains("\"points\":[") {
        person_error("computed data; expected point arrays");
    }
}

fn main() {
    let mut arguments = env::args().skip(1);
    let data_root = PathBuf::from(arguments.next().unwrap_or_else(|| "site/data".to_string()));
    let repo_root = PathBuf::from(arguments.next().unwrap_or_else(|| ".".to_string()));
    let entries = check_entries(&read_file(&data_root, "entries.json"));
    let (problem_count, problem_ids, _house_ids) = check_problems(&read_file(&data_root, "problems.json"));
    let (attempt_count, solution_paths) = check_attempts(&read_file(&data_root, "attempts.json"), &problem_ids, &repo_root);
    check_solutions_directory(&repo_root, &solution_paths);
    let solved = check_solved(&read_file(&data_root, "solved.json"));
    check_computed_data(&data_root);
    println!("night; the checks hold; {} entries, {} problems, {} attempts, {} closed pages, {} solution files", entries.len(), problem_count, attempt_count, solved, solution_paths.len());
}
