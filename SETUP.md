# Setting up Agentlings

These steps are written for Claude Code (or any coding agent) to follow on the user's behalf. Do them in order, tell the user what you are doing as you go, and stop to ask before installing anything on their machine.

## 1. Check the requirements

Agentlings only runs on macOS. Check each of these and report what is missing:

```bash
sw_vers -productVersion        # any recent macOS
node --version                 # needs v20 or later
cargo --version                # Rust, stable
xcode-select -p                # Xcode Command Line Tools
ls ~/Library/Application\ Support/Claude/claude-code-sessions  # Claude desktop sessions exist
```

If something is missing, tell the user and suggest the fix, but ask before running it:

- Node: `brew install node`, or the installer from nodejs.org
- Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Command Line Tools: `xcode-select --install`
- No sessions folder: they need the Claude desktop app with at least one Claude Code session

## 2. Install the dependencies

```bash
npm install
```

## 3. Match sidebar groups to creatures

Make the user's own creature list, which git ignores:

```bash
node tools/ensure-species.mjs
```

That copies `src/lib/species.example.json` to `src/lib/species.json`. Now list the user's Claude sidebar groups:

```bash
node -e '
const f = require("os").homedir() + "/Library/Application Support/Claude/claude_desktop_config.json";
const prefs = require(f).preferences?.epitaxyPrefs ?? {};
const sections = Object.values(prefs["dframe-code-sections"] ?? {}).flatMap((s) => s.sections ?? []);
console.log([...new Set(sections.map((s) => s.name))].join("\n") || "No sidebar groups found");
'
```

Only group names are printed. Don't print or copy anything else from that file, as it also holds the user's connector settings.

Show the user their groups and the creatures available, then suggest a creature for each group that fits its name. Ask them to confirm or change the pairings. Rewrite `src/lib/species.json` with their choices, using each group name in lower case as the key. Groups they leave out get a fluff in the group's own colour, which is fine.

| Species | Fits groups about | Scene that suits it |
|---|---|---|
| `noteling` (a music note) | music, audio, a band | `stage` |
| `octopus` | Claude, AI, agents | `sea` |
| `snail` | life admin, slow chores, errands | `garden` |
| `mug` | work, the day job | `office` |
| `palette` | design, art, visual work | `studio` |
| `bot` (a robot) | tools, scripts, workspace, automation | `control` |
| `beaver` (in a hard hat) | projects, building things | `riverbank` |
| `fluff` | anything else | `meadow` |

Colours are hex, such as `#7F77DD`. Pick ones that suit the creature, or ask the user.

## 4. Test and build

```bash
npm run test:ui
cargo test -p hub-core
npm run bundle
```

The build takes a few minutes the first time. Run it in the background if you can. The app ends up at `target/release/bundle/macos/Agentlings.app`.

## 5. Open it

Ask whether the user wants it in their Applications folder. If they do:

```bash
cp -R "target/release/bundle/macos/Agentlings.app" /Applications/
open "/Applications/Agentlings.app"
```

Otherwise open it where it is:

```bash
open "target/release/bundle/macos/Agentlings.app"
```

## 6. Explain the basics

Tell the user, briefly:

- A menu bar icon shows how many sessions need them. Its menu jumps to those sessions.
- Closing the window only hides it. The menu bar icon brings it back, and Quit is in its menu.
- Click a creature to open its session. Right-click to dismiss or hide it.
- The speaker button mutes the alert sounds.
- To change creatures later, edit `src/lib/species.json` and run `npm run bundle` again.
- Agentlings reads Claude's internal files, so a Claude update can break it. If it does, the reading code is in `crates/hub-core`.

## If something goes wrong

| Symptom | Likely cause |
|---|---|
| "Sidebar groups unavailable, grouped by project folder" | Claude changed how it stores sidebar groups. Look at `crates/hub-core/src/groups.rs` against the current `claude_desktop_config.json` |
| No sessions at all | The sessions folder is missing or its format changed. See `crates/hub-core/src/records.rs` and `scan.rs` |
| Build fails on `species.json` | Run `node tools/ensure-species.mjs`, then build again |
| "Unidentified developer" warning | Only happens when the app was built on another Mac. Right-click the app and choose Open |
