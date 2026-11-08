//! Alert sounds. Each creature has its own: one when a session starts needing you, one when
//! it fails. Made by tools/make-sounds.py, embedded in the binary, written once to the app's
//! data folder and played with macOS's own `afplay`. Muting is saved in the same folder.

use hub_core::State;
use serde::Deserialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

macro_rules! sounds {
    ($($name:literal),* $(,)?) => {
        &[$(($name, include_bytes!(concat!("../sounds/", $name, ".wav")))),*]
    };
}

const SOUNDS: &[(&str, &[u8])] = sounds![
    "noteling-needs", "noteling-failed", "octopus-needs", "octopus-failed", "snail-needs", "snail-failed",
    "mug-needs", "mug-failed", "palette-needs", "palette-failed", "bot-needs", "bot-failed", "fluff-needs", "fluff-failed",
    "beaver-needs", "beaver-failed",
];

/// The same hub-to-species list the window draws from.
const SPECIES_JSON: &str = include_str!("../../src/lib/species.json");

/// Several alerts landing together make one sound, and never more than one in this gap.
const GAP: Duration = Duration::from_millis(1500);

#[derive(Deserialize)]
struct Look {
    species: String,
}

pub struct Sounds {
    dir: PathBuf,
    settings: PathBuf,
    species: HashMap<String, String>,
    muted: AtomicBool,
    last: Mutex<Option<Instant>>,
}

impl Sounds {
    pub fn new(data_dir: &Path) -> Self {
        let dir = data_dir.join("sounds");
        let _ = std::fs::create_dir_all(&dir);
        for (name, bytes) in SOUNDS {
            let path = dir.join(format!("{name}.wav"));
            if std::fs::read(&path).ok().as_deref() != Some(*bytes) {
                if let Err(e) = std::fs::write(&path, bytes) {
                    eprintln!("sound: could not write {}: {e}", path.display());
                }
            }
        }
        let species = serde_json::from_str::<HashMap<String, Look>>(SPECIES_JSON)
            .map(|m| m.into_iter().map(|(hub, look)| (hub, look.species)).collect())
            .unwrap_or_default();
        let settings = data_dir.join("sound.json");
        let muted = std::fs::read(&settings)
            .ok()
            .and_then(|b| serde_json::from_slice::<serde_json::Value>(&b).ok())
            .and_then(|v| v.get("muted").and_then(|m| m.as_bool()))
            .unwrap_or(false);
        Sounds { dir, settings, species, muted: AtomicBool::new(muted), last: Mutex::new(None) }
    }

    pub fn muted(&self) -> bool {
        self.muted.load(Ordering::Relaxed)
    }

    pub fn set_muted(&self, muted: bool) {
        self.muted.store(muted, Ordering::Relaxed);
        if let Err(e) = std::fs::write(&self.settings, serde_json::json!({ "muted": muted }).to_string()) {
            eprintln!("sound: could not save {}: {e}", self.settings.display());
        }
    }

    fn species_for(&self, hub: &str) -> &str {
        self.species.get(&hub.trim().to_lowercase()).map_or("fluff", String::as_str)
    }

    /// Plays the alert for the first of these, unless muted or one played just now.
    pub fn alert(&self, alarms: &[(String, State)]) {
        let Some((hub, state)) = alarms.first() else { return };
        if self.muted() {
            return;
        }
        {
            let mut last = self.last.lock().unwrap();
            if last.is_some_and(|t| t.elapsed() < GAP) {
                return;
            }
            *last = Some(Instant::now());
        }
        let kind = if *state == State::Failed { "failed" } else { "needs" };
        let own = format!("{}-{kind}", self.species_for(hub));
        // A creature without sounds of its own borrows the fluff's.
        let name = if self.dir.join(format!("{own}.wav")).exists() { own } else { format!("fluff-{kind}") };
        self.play(&name);
    }

    pub fn play(&self, name: &str) {
        let path = self.dir.join(format!("{name}.wav"));
        match Command::new("/usr/bin/afplay").arg(&path).spawn() {
            Ok(mut child) => {
                println!("sound: {name}");
                // Reap it when it finishes, so finished players don't pile up.
                std::thread::spawn(move || child.wait());
            }
            Err(e) => eprintln!("sound: afplay failed for {name}: {e}"),
        }
    }
}
