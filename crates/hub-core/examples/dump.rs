//! Prints one scan of the real data as JSON to stdout, for checking by hand.
//! Run: cargo run -p hub-core --example dump
//! Output holds session titles, so keep it out of the repo.

fn main() {
    let paths = hub_core::default_paths().expect("HOME is set");
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as i64;
    println!("{}", serde_json::to_string_pretty(&hub_core::Scanner::new(paths).snapshot(now)).unwrap());
}
