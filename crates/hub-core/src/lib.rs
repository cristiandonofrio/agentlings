//! Reads the Claude desktop app's session data and turns it into hubs of sessions.
//!
//! Everything here is read-only. Files are only ever opened for reading, and nothing
//! in this crate touches the network. The formats are internal to Claude and
//! undocumented, so an app update could change them.

pub mod describe;
pub mod groups;
pub mod records;
pub mod scan;
pub mod state;
pub mod transcript;

pub use scan::{default_paths, Paths, Scanner};

use serde::Serialize;

/// The four states the window shows. Creature art is drawn against these names.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum State {
    Working,
    Needs,
    Idle,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub title: String,
    pub state: State,
    /// Finer wording than the state, for example "Quiet" or "Stopped".
    pub label: String,
    pub doing: String,
    /// Subagents running right now.
    pub helpers: usize,
    /// The project folder, with any worktree folder stripped.
    pub folder: String,
    /// Milliseconds since 1970. When a turn last started or ended, and when you last wrote.
    pub last_activity: i64,
    pub last_used: i64,
    /// Finished a turn since you last opened it in Claude. See `is_unread`.
    pub unread: bool,
    /// See `state::Status::alert_key`. Stays in this process, the window doesn't need it.
    #[serde(skip)]
    pub alert_key: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Hub {
    pub id: String,
    pub name: String,
    pub colour: String,
    /// Where a new session from this hub starts. Empty when there's no usable folder.
    pub folder: String,
    pub sessions: Vec<Session>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    /// "sidebar" or "folder".
    pub group_source: String,
    /// Why the fallback was used. Empty when the sidebar groups were read.
    pub group_note: String,
    pub hubs: Vec<Hub>,
    pub total_records: usize,
    pub archived_hidden: usize,
}

/// What the menu bar shows. Hidden sessions count too, so they can't be missed.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Attention {
    /// Id and title of each session that needs you or has failed.
    pub urgent: Vec<(String, String)>,
    /// Sessions that may be waiting for approval.
    pub quiet: usize,
}

/// How long an unread finish stays unread. After this the creature would be asleep anyway.
pub const UNREAD_FOR_MS: i64 = 36 * 60 * 60 * 1000;

/// A session finished a turn you haven't looked at: it's idle (not a waved-off alert) and
/// its last turn ended after you last switched to it in Claude. Claude keeps its own unread
/// dots out of reach, so this is worked out from the session's record. Sessions never
/// focused don't count, and nothing stays unread past `UNREAD_FOR_MS`.
pub fn is_unread(state: State, label: &str, turn_end: i64, focused: i64, now: i64) -> bool {
    state == State::Idle && label != "Dismissed" && focused > 0 && turn_end > focused + 2_000 && now - turn_end < UNREAD_FOR_MS
}

/// Sessions that have just started needing you or just failed since the last snapshot,
/// as (hub name, new state), for the alert sound. A session already in that state before
/// stays quiet, so each alert sounds once.
pub fn new_alarms(before: &Snapshot, after: &Snapshot) -> Vec<(String, State)> {
    let old: std::collections::HashMap<&str, State> =
        before.hubs.iter().flat_map(|h| &h.sessions).map(|s| (s.id.as_str(), s.state)).collect();
    after
        .hubs
        .iter()
        .flat_map(|h| h.sessions.iter().map(move |s| (h, s)))
        .filter(|(_, s)| matches!(s.state, State::Needs | State::Failed) && old.get(s.id.as_str()) != Some(&s.state))
        .map(|(h, s)| (h.name.clone(), s.state))
        .collect()
}

pub fn attention(snapshot: &Snapshot) -> Attention {
    let mut out = Attention::default();
    for s in snapshot.hubs.iter().flat_map(|h| &h.sessions) {
        match s.state {
            State::Needs | State::Failed => out.urgent.push((s.id.clone(), s.title.clone())),
            State::Working if s.label == "Quiet" => out.quiet += 1,
            _ => {}
        }
    }
    out
}

/// The key to remember when you dismiss a session's alert. None when it has no alert.
pub fn alert_to_dismiss(snapshot: &Snapshot, id: &str) -> Option<String> {
    snapshot
        .hubs
        .iter()
        .flat_map(|h| &h.sessions)
        .find(|s| s.id == id && matches!(s.state, State::Needs | State::Failed) && !s.alert_key.is_empty())
        .map(|s| s.alert_key.clone())
}

/// Drops dismissals that no longer apply: the session moved on to a new alert or none,
/// or it's gone. Returns true if anything was dropped.
pub fn prune_dismissed(snapshot: &Snapshot, dismissed: &mut std::collections::HashMap<String, String>) -> bool {
    let still: std::collections::HashSet<&str> = snapshot
        .hubs
        .iter()
        .flat_map(|h| &h.sessions)
        .filter(|s| s.label == "Dismissed")
        .map(|s| s.id.as_str())
        .collect();
    let before = dismissed.len();
    dismissed.retain(|id, _| still.contains(id.as_str()));
    dismissed.len() != before
}

/// The folder of the most recently active session that lives somewhere real. Sessions
/// come most recent first, and scratch workspaces are throwaway folders the app made.
pub fn hub_folder(sessions: &[Session]) -> String {
    sessions
        .iter()
        .map(|s| s.folder.as_str())
        .find(|f| f.starts_with('/') && !f.contains("/scratch-workspaces/"))
        .unwrap_or_default()
        .to_string()
}

fn percent_encode(text: &str, keep_slash: bool) -> String {
    let mut encoded = String::new();
    for byte in text.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.' | b'_' | b'~' => encoded.push(byte as char),
            b'/' if keep_slash => encoded.push('/'),
            _ => encoded.push_str(&format!("%{byte:02X}")),
        }
    }
    encoded
}

/// The link the Claude app's own Dock menu uses to start a session in a folder.
pub fn new_session_link(folder: &str) -> Option<String> {
    folder.starts_with('/').then(|| format!("claude://code/new?folder={}", percent_encode(folder, true)))
}

/// A new Claude Code session with a prompt already typed, asking it to archive these
/// sessions. The hub can't archive them itself: Claude holds sessions in memory, so only
/// Claude can change them. Takes (id, title) pairs. None if no id is a local session.
pub fn archive_link(sessions: &[(String, String)]) -> Option<String> {
    let lines: Vec<String> = sessions
        .iter()
        .filter(|(id, _)| session_link(id).is_some())
        .map(|(id, title)| format!("- {} ({id})", title.replace(['\n', '\r'], " ")))
        .collect();
    if lines.is_empty() {
        return None;
    }
    let prompt = format!(
        "Archive these Claude Code sessions. I hid them in Agentlings and I'm done with them. \
         Use your session tools to archive each one by its id, then tell me which were archived \
         and which, if any, couldn't be.\n\n{}",
        lines.join("\n")
    );
    Some(format!("claude://code/new?q={}", percent_encode(&prompt, false)))
}

/// The deep link the Claude app answers to. None unless the id looks like a local
/// session, because the result is handed to `open`.
pub fn session_link(id: &str) -> Option<String> {
    let rest = id.strip_prefix("local_")?;
    let ok = !rest.is_empty() && rest.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    ok.then(|| format!("claude://claude.ai/epitaxy/{id}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn session(id: &str, state: State, label: &str, folder: &str) -> Session {
        Session {
            id: id.into(),
            title: format!("title {id}"),
            state,
            label: label.into(),
            doing: String::new(),
            helpers: 0,
            folder: folder.into(),
            last_activity: 0,
            last_used: 0,
            unread: false,
            alert_key: String::new(),
        }
    }

    #[test]
    fn a_finish_is_unread_until_you_open_the_session() {
        let now = 100 * 60 * 60 * 1000;
        let hour = 60 * 60 * 1000;
        assert!(is_unread(State::Idle, "Idle", now - hour, now - 2 * hour, now));
        assert!(!is_unread(State::Idle, "Idle", now - 2 * hour, now - hour, now), "opened since");
        assert!(!is_unread(State::Working, "Working", now - hour, now - 2 * hour, now), "still busy");
        assert!(!is_unread(State::Idle, "Dismissed", now - hour, now - 2 * hour, now), "waved off");
        assert!(!is_unread(State::Idle, "Idle", now - hour, 0, now), "never focused");
        assert!(!is_unread(State::Idle, "Idle", now - 40 * hour, now - 41 * hour, now), "too old");
        assert!(!is_unread(State::Idle, "Idle", now - hour, now - hour - 1_000, now), "ended as you looked");
    }

    #[test]
    fn attention_counts_urgent_and_quiet_only() {
        let hub = Hub {
            id: "h".into(),
            name: "h".into(),
            colour: String::new(),
            folder: String::new(),
            sessions: vec![
                session("a", State::Needs, "", ""),
                session("b", State::Failed, "", ""),
                session("c", State::Working, "Quiet", ""),
                session("d", State::Working, "Working", ""),
                session("e", State::Idle, "", ""),
            ],
        };
        let snap = Snapshot {
            group_source: String::new(),
            group_note: String::new(),
            hubs: vec![hub],
            total_records: 0,
            archived_hidden: 0,
        };
        let got = attention(&snap);
        assert_eq!(got.urgent.iter().map(|(id, _)| id.as_str()).collect::<Vec<_>>(), ["a", "b"]);
        assert_eq!(got.quiet, 1);
    }

    fn snap(sessions: Vec<Session>) -> Snapshot {
        let hub = Hub { id: "h".into(), name: "h".into(), colour: String::new(), folder: String::new(), sessions };
        Snapshot { group_source: String::new(), group_note: String::new(), hubs: vec![hub], total_records: 0, archived_hidden: 0 }
    }

    #[test]
    fn alarms_sound_once_when_a_session_starts_needing_you_or_fails() {
        let before = snap(vec![
            session("a", State::Working, "", ""),
            session("b", State::Needs, "", ""),
            session("c", State::Working, "", ""),
            session("d", State::Needs, "", ""),
        ]);
        let after = snap(vec![
            session("a", State::Needs, "", ""),
            session("b", State::Needs, "", ""),
            session("c", State::Failed, "", ""),
            session("d", State::Idle, "", ""),
            session("e", State::Needs, "", ""),
        ]);
        let got = new_alarms(&before, &after);
        assert_eq!(got, [("h".to_string(), State::Needs), ("h".to_string(), State::Failed), ("h".to_string(), State::Needs)]);
        assert!(new_alarms(&after, &after).is_empty());
    }

    #[test]
    fn only_sessions_with_an_alert_can_be_dismissed() {
        let mut a = session("a", State::Needs, "Needs you", "");
        a.alert_key = "reply:u1".into();
        let mut b = session("b", State::Idle, "Idle", "");
        b.alert_key = String::new();
        let s = snap(vec![a, b]);
        assert_eq!(alert_to_dismiss(&s, "a").as_deref(), Some("reply:u1"));
        assert_eq!(alert_to_dismiss(&s, "b"), None);
        assert_eq!(alert_to_dismiss(&s, "missing"), None);
    }

    #[test]
    fn dismissals_drop_once_the_session_moves_on() {
        let s = snap(vec![session("a", State::Idle, "Dismissed", ""), session("b", State::Needs, "Needs you", "")]);
        let mut d: std::collections::HashMap<String, String> =
            [("a", "k"), ("b", "old"), ("gone", "k")].iter().map(|(i, k)| (i.to_string(), k.to_string())).collect();
        assert!(prune_dismissed(&s, &mut d));
        assert_eq!(d.keys().collect::<Vec<_>>(), ["a"]);
        assert!(!prune_dismissed(&s, &mut d));
    }

    #[test]
    fn hub_folder_is_the_newest_real_folder() {
        let sessions = [
            session("d", State::Idle, "", ""),
            session("c", State::Idle, "", "/x/scratch-workspaces/y"),
            session("b", State::Idle, "", "/new/project"),
            session("a", State::Idle, "", "/old/project"),
        ];
        assert_eq!(hub_folder(&sessions), "/new/project");
        assert_eq!(hub_folder(&sessions[..2]), "");
    }

    #[test]
    fn new_session_links_are_encoded_and_absolute_only() {
        assert_eq!(
            new_session_link("/Users/me/My Work/a&b").unwrap(),
            "claude://code/new?folder=/Users/me/My%20Work/a%26b"
        );
        assert_eq!(new_session_link("relative/path"), None);
    }

    #[test]
    fn archive_link_lists_local_sessions_only() {
        let pick = vec![
            ("local_a1".to_string(), "First & best".to_string()),
            ("session_x".to_string(), "Not local".to_string()),
        ];
        let link = archive_link(&pick).unwrap();
        assert!(link.starts_with("claude://code/new?q=Archive%20these"));
        assert!(link.contains("First%20%26%20best%20%28local_a1%29"));
        assert!(!link.contains("session_x"));
        assert_eq!(archive_link(&pick[1..]), None);
    }

    #[test]
    fn link_accepts_local_ids_only() {
        assert_eq!(session_link("local_ab-12").unwrap(), "claude://claude.ai/epitaxy/local_ab-12");
        assert!(session_link("session_abc").is_none());
        assert!(session_link("local_").is_none());
        assert!(session_link("local_a/../b").is_none());
        assert!(session_link("local_a b").is_none());
    }
}
