// small machines; referee. the arena gate. one file, no crates; it exists to keep claims legible.
// usage; cargo run --manifest-path referee/Cargo.toml -- site/data

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
    let mut depth = 0;
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

fn check_entries(document: &str) -> usize {
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
    rows.len()
}

fn check_problems(document: &str) -> (usize, HashSet<String>) {
    if !document.trim_start().starts_with('[') {
        person_error("problems; expected an array");
    }
    let rows = objects(document);
    if rows.len() > 200 {
        person_error("problems; more than 200 rows");
    }
    let mut ids = HashSet::new();
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
    }
    (rows.len(), ids)
}

fn check_attempts(document: &str, problem_ids: &HashSet<String>) -> usize {
    if !document.trim_start().starts_with('[') {
        person_error("attempts; expected an array");
    }
    let rows = objects(document);
    let mut ids = HashSet::new();
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
        if !row.contains("\"date\":\"20") {
            person_error(&format!("attempt {}; date must be an ISO date", id));
        }
    }
    rows.len()
}

fn main() {
    let argument = env::args().nth(1).unwrap_or_else(|| "site/data".to_string());
    let root = PathBuf::from(argument);
    let entries = check_entries(&read_file(&root, "entries.json"));
    let (problems, problem_ids) = check_problems(&read_file(&root, "problems.json"));
    let attempts = check_attempts(&read_file(&root, "attempts.json"), &problem_ids);
    let phyllotaxis = read_file(&root, "phyllotaxis.json");
    let lorenz = read_file(&root, "lorenz.json");
    if !phyllotaxis.contains("\"points\":[") || !lorenz.contains("\"points\":[") {
        person_error("computed data; expected point arrays");
    }
    println!("night; the checks hold; {} entries, {} problems, {} attempts", entries, problems, attempts);
}
