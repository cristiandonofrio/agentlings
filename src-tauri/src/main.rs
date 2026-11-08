#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Agentlings window. A background thread watches Claude's files, rescans on change and
//! emits a snapshot to the window. There's no server: the frontend is embedded in the
//! binary and talks to this process over Tauri's IPC.

mod sound;

use hub_core::{
    alert_to_dismiss, archive_link, attention, default_paths, new_alarms, new_session_link, prune_dismissed, session_link, Attention, Paths,
    Scanner, Snapshot,
};
use sound::Sounds;
use std::collections::HashMap;
use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::mpsc::{channel, Receiver, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, RunEvent, State, WindowEvent};

/// Lets several quick writes share one rescan.
const SETTLE: Duration = Duration::from_millis(300);
/// States also change with no file event: a quiet tool, or a turn going stale.
const TICK: Duration = Duration::from_secs(10);

const TRAY_ID: &str = "hub";
const TRAY_ICON: &[u8] = include_bytes!("../icons/tray.png");
const TRAY_ALERT_ICON: &[u8] = include_bytes!("../icons/tray-alert.png");
/// Menu item ids for sessions start with this, then the session id.
const OPEN_PREFIX: &str = "open:";

#[derive(Default)]
struct Latest(Arc<Mutex<Option<Snapshot>>>);

/// Alerts you've waved off: session id to the alert key at the time. Kept in the app's
/// own data folder, never in Claude's.
struct Dismissed {
    map: Arc<Mutex<HashMap<String, String>>>,
    file: PathBuf,
}

/// Asks the watch thread for a rescan now rather than at the next tick.
struct Rescan(Mutex<Sender<()>>);

fn load_dismissed(file: &Path) -> HashMap<String, String> {
    std::fs::read(file).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
}

fn save_dismissed(file: &Path, map: &HashMap<String, String>) {
    if let Some(dir) = file.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    if let Err(e) = std::fs::write(file, serde_json::to_vec(map).unwrap_or_default()) {
        eprintln!("dismiss: could not save {}: {e}", file.display());
    }
}

/// Opens a new Claude Code session with a prompt to archive these sessions.
#[tauri::command]
fn archive_in_claude(ids: Vec<String>, latest: State<Latest>) -> Result<(), String> {
    let picked: Vec<(String, String)> = {
        let latest = latest.0.lock().unwrap();
        let sessions: Vec<_> = latest.iter().flat_map(|s| &s.hubs).flat_map(|h| &h.sessions).collect();
        ids.iter()
            .filter_map(|id| sessions.iter().find(|s| &s.id == id).map(|s| (s.id.clone(), s.title.clone())))
            .collect()
    };
    let link = archive_link(&picked).ok_or("no sessions to archive")?;
    let status = Command::new("/usr/bin/open").arg(&link).status().map_err(|e| e.to_string())?;
    println!("archive: asked Claude about {} sessions, exit={}", picked.len(), status.code().unwrap_or(-1));
    status.success().then_some(()).ok_or_else(|| "open failed".into())
}

/// Quietens a session's "needs you" or error until something new happens in it.
#[tauri::command]
fn dismiss(id: String, latest: State<Latest>, dismissed: State<Dismissed>, rescan: State<Rescan>) -> Result<(), String> {
    let key = latest.0.lock().unwrap().as_ref().and_then(|s| alert_to_dismiss(s, &id)).ok_or("nothing to dismiss")?;
    let mut map = dismissed.map.lock().unwrap();
    map.insert(id.clone(), key);
    save_dismissed(&dismissed.file, &map);
    println!("dismiss: {id}");
    let _ = rescan.0.lock().unwrap().send(());
    Ok(())
}

#[tauri::command]
fn get_muted(sounds: State<Arc<Sounds>>) -> bool {
    sounds.muted()
}

/// Turning sound back on plays a ping, so you know it worked.
#[tauri::command]
fn set_muted(muted: bool, sounds: State<Arc<Sounds>>) {
    sounds.set_muted(muted);
    println!("sound: muted={muted}");
    if !muted {
        sounds.play("fluff-needs");
    }
}

/// Demo mode: the window shows made-up hubs and no sounds play. Set AGENTLINGS_DEMO=1.
fn demo() -> bool {
    std::env::var_os("AGENTLINGS_DEMO").is_some()
}

#[tauri::command]
fn is_demo() -> bool {
    demo()
}

#[tauri::command]
fn get_snapshot(latest: State<Latest>) -> Option<Snapshot> {
    latest.0.lock().unwrap().clone()
}

#[tauri::command]
fn open_session(id: String) -> Result<(), String> {
    let link = session_link(&id).ok_or("not a local session id")?;
    let status = Command::new("/usr/bin/open").arg(&link).status().map_err(|e| e.to_string())?;
    println!("open: {id} exit={}", status.code().unwrap_or(-1));
    status.success().then_some(()).ok_or_else(|| "open failed".into())
}

#[tauri::command]
fn new_session(folder: String) -> Result<(), String> {
    let link = new_session_link(&folder).ok_or("not an absolute folder")?;
    let status = Command::new("/usr/bin/open").arg(&link).status().map_err(|e| e.to_string())?;
    println!("new session: {folder} exit={}", status.code().unwrap_or(-1));
    status.success().then_some(()).ok_or_else(|| "open failed".into())
}

fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn short(title: &str) -> String {
    const MAX: usize = 44;
    if title.chars().count() <= MAX {
        return title.to_string();
    }
    format!("{}...", title.chars().take(MAX - 3).collect::<String>())
}

fn tray_menu(app: &AppHandle, now: &Attention) -> tauri::Result<Menu<tauri::Wry>> {
    let menu = Menu::new(app)?;
    let heading = match (now.urgent.len(), now.quiet) {
        (0, 0) => "Nothing needs you".to_string(),
        (0, q) => format!("{q} may need you"),
        (1, _) => "1 needs you".to_string(),
        (n, _) => format!("{n} need you"),
    };
    menu.append(&MenuItem::new(app, heading, false, None::<&str>)?)?;
    for (id, title) in &now.urgent {
        menu.append(&MenuItem::with_id(app, format!("{OPEN_PREFIX}{id}"), short(title), true, None::<&str>)?)?;
    }
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    menu.append(&MenuItem::with_id(app, "show", "Show Agentlings", true, None::<&str>)?)?;
    menu.append(&MenuItem::with_id(app, "quit", "Quit Agentlings", true, None::<&str>)?)?;
    Ok(menu)
}

fn update_tray(app: &AppHandle, now: &Attention) -> tauri::Result<()> {
    let Some(tray) = app.tray_by_id(TRAY_ID) else { return Ok(()) };
    let urgent = !now.urgent.is_empty();
    let title = match (now.urgent.len(), now.quiet) {
        (0, 0) => String::new(),
        (0, _) => "?".to_string(),
        (n, _) => n.to_string(),
    };
    tray.set_icon(Some(Image::from_bytes(if urgent { TRAY_ALERT_ICON } else { TRAY_ICON })?))?;
    tray.set_icon_as_template(true)?;
    tray.set_title(Some(title.as_str()))?;
    tray.set_menu(Some(tray_menu(app, now)?))?;
    println!("tray: urgent={} quiet={} title={title:?}", now.urgent.len(), now.quiet);
    Ok(())
}

/// The window reports what it drew, so a run can be checked from the terminal.
#[tauri::command]
fn report_rendered(hubs: usize, creatures: usize, states: String) {
    println!("window: drew {hubs} hubs, {creatures} creatures ({states})");
}

fn now_ms() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |d| d.as_millis() as i64)
}

fn log_snapshot(s: &Snapshot) {
    let live: usize = s.hubs.iter().map(|h| h.sessions.len()).sum();
    println!(
        "scan: {} records, {} archived hidden, {live} active, groups from {}{}",
        s.total_records,
        s.archived_hidden,
        s.group_source,
        if s.group_note.is_empty() { String::new() } else { format!(" ({})", s.group_note) },
    );
    let hubs: Vec<_> = s.hubs.iter().map(|h| format!("{}={}", h.name, h.sessions.len())).collect();
    println!("hubs: {}", hubs.join(", "));
}

#[allow(clippy::too_many_arguments)]
fn watch(
    app: AppHandle,
    paths: Paths,
    sounds: Arc<Sounds>,
    latest: Arc<Mutex<Option<Snapshot>>>,
    dismissed: Arc<Mutex<HashMap<String, String>>>,
    dismissed_file: PathBuf,
    tx: Sender<()>,
    rx: Receiver<()>,
) {
    let config = paths.desktop_config.clone();
    let config_dir = config.parent().map(Path::to_path_buf);
    let handler = move |res: notify::Result<notify::Event>| {
        let Ok(event) = res else { return };
        if matches!(event.kind, EventKind::Access(_)) {
            return;
        }
        // The config's folder also holds cookies and caches, so only that file counts there.
        let relevant = event.paths.iter().any(|p| p == &config || p.parent() != config_dir.as_deref());
        if relevant {
            let _ = tx.send(());
        }
    };
    let mut watcher = match RecommendedWatcher::new(handler, notify::Config::default()) {
        Ok(w) => Some(w),
        Err(e) => {
            eprintln!("watch: unavailable, using the {}s tick only: {e}", TICK.as_secs());
            None
        }
    };
    if let Some(w) = watcher.as_mut() {
        let targets = [
            (paths.sessions_root.as_path(), RecursiveMode::Recursive),
            (paths.transcripts_root.as_path(), RecursiveMode::Recursive),
            (paths.desktop_config.parent().unwrap_or(Path::new("/")), RecursiveMode::NonRecursive),
        ];
        for (path, mode) in targets {
            match w.watch(path, mode) {
                Ok(()) => println!("watch: {}", path.display()),
                Err(e) => eprintln!("watch: failed on {}: {e}", path.display()),
            }
        }
    }

    let mut scanner = Scanner::new(paths);
    let mut shown: Option<Attention> = None;
    loop {
        scanner.dismissed = dismissed.lock().unwrap().clone();
        let snap = scanner.snapshot(now_ms());
        {
            let mut map = dismissed.lock().unwrap();
            if prune_dismissed(&snap, &mut map) {
                save_dismissed(&dismissed_file, &map);
            }
        }
        let changed = latest.lock().unwrap().as_ref() != Some(&snap);
        if changed {
            log_snapshot(&snap);
            if let Some(before) = latest.lock().unwrap().as_ref().filter(|_| !demo()) {
                sounds.alert(&new_alarms(before, &snap));
            }
            *latest.lock().unwrap() = Some(snap.clone());
            if let Err(e) = app.emit("snapshot", &snap) {
                eprintln!("emit failed: {e}");
            }
            let now = attention(&snap);
            if shown.as_ref() != Some(&now) {
                if let Err(e) = update_tray(&app, &now) {
                    eprintln!("tray update failed: {e}");
                }
                shown = Some(now);
            }
        }
        match rx.recv_timeout(TICK) {
            Ok(()) => {
                std::thread::sleep(SETTLE);
                while rx.try_recv().is_ok() {}
            }
            Err(RecvTimeoutError::Timeout) => {}
            Err(RecvTimeoutError::Disconnected) => std::thread::sleep(TICK),
        }
    }
}

fn main() {
    tauri::Builder::default()
        .manage(Latest::default())
        .invoke_handler(tauri::generate_handler![
            get_snapshot,
            is_demo,
            open_session,
            new_session,
            dismiss,
            archive_in_claude,
            report_rendered,
            get_muted,
            set_muted
        ])
        .on_window_event(|window, event| {
            // Closing only hides the window, so the menu bar count keeps running.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(|app| {
            TrayIconBuilder::with_id(TRAY_ID)
                .icon(Image::from_bytes(TRAY_ICON)?)
                .icon_as_template(true)
                .tooltip("Agentlings")
                .menu(&tray_menu(app.handle(), &Attention::default())?)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_window(app),
                    "quit" => app.exit(0),
                    id => {
                        if let Some(session) = id.strip_prefix(OPEN_PREFIX) {
                            let _ = open_session(session.to_string());
                        }
                    }
                })
                .build(app)?;
            let paths = default_paths().ok_or("HOME is not set")?;
            let latest = app.state::<Latest>().0.clone();
            let data_dir = app.path().app_data_dir()?;
            let sounds = Arc::new(Sounds::new(&data_dir));
            app.manage(sounds.clone());
            let file = data_dir.join("dismissed.json");
            let map = Arc::new(Mutex::new(load_dismissed(&file)));
            let (tx, rx) = channel();
            app.manage(Dismissed { map: map.clone(), file: file.clone() });
            app.manage(Rescan(Mutex::new(tx.clone())));
            let handle = app.handle().clone();
            std::thread::spawn(move || watch(handle, paths, sounds, latest, map, file, tx, rx));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Agentlings")
        .run(|app, event| {
            // Clicking the Dock icon brings a hidden window back.
            if let RunEvent::Reopen { .. } = event {
                show_window(app);
            }
        });
}
