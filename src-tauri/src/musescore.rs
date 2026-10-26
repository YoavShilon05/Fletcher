//! Renders .mscz charts with the host's installed MuseScore Studio — the real
//! engraving engine, the same one musescore.com runs server-side — through its
//! command-line converter. Unlike webmscore (a frozen MuseScore 3.6 WASM port),
//! this reads every MuseScore 4 feature natively: TAB tunings, pedal lines,
//! 4.4+ key signatures, 4.6+ chord symbols, part layouts, and so on.
//!
//! Two converter passes per chart:
//!   1. `--score-parts` → every part (the file's own + one per uncovered
//!      instrument, exactly what MuseScore's Parts dialog offers) as a
//!      standalone .mscz, base64'd into a JSON file.
//!   2. one `-j` batch job → SVG pages + measure positions (.mpos) for the full
//!      score and each part, plus the full score's MusicXML.
//!
//! The raw outputs go back to the frontend, which normalizes them into the
//! chart cache (see src/lib/musescore/bake.ts).

use std::ffi::OsStr;
use std::fs::{self, File};
use std::io::{Cursor, Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use base64::Engine;
use serde::{Deserialize, Serialize};
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

/// Overrides auto-detection: absolute path to a MuseScore 4+ executable.
const PATH_ENV_VAR: &str = "FLETCHER_MUSESCORE";

/// A big orchestral score takes a while; anything past this is a hung process.
const CONVERTER_TIMEOUT: Duration = Duration::from_secs(10 * 60);

/// `-r` sets the "PNG DPI" that .mpos coordinates are scaled by:
/// (dpi / 1200 engraving DPI) * 12. At 100 that factor is exactly 1, so measure
/// boxes land in the SVG's own viewBox units — independent of whatever export
/// DPI the user has set in MuseScore's preferences.
const POSITIONS_DPI: &str = "100";

/// One bake at a time: each converter run is CPU-heavy and they'd only contend.
static BAKE_LOCK: Mutex<()> = Mutex::new(());

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderedView {
    name: String,
    /// Raw SVG documents, one per page, in page order.
    pages: Vec<String>,
    /// Raw .mpos XML (measure boxes + playback-ordered events).
    mpos: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MuseScoreBake {
    full: RenderedView,
    parts: Vec<RenderedView>,
    music_xml: String,
}

/// Shape of `--score-parts` output (we ignore `partsMeta`).
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScoreParts {
    parts: Vec<String>,
    parts_bin: Vec<String>,
}

// ── Locating MuseScore ───────────────────────────────────────────────────────

/// Leading major version in a name like "MuseScore 4", "MuseScore Studio 5.app".
fn major_version_in(name: &str) -> Option<u32> {
    let digits: String = name
        .chars()
        .skip_while(|c| !c.is_ascii_digit())
        .take_while(|c| c.is_ascii_digit())
        .collect();
    digits.parse().ok()
}

/// `<dir>/MuseScore*` install folders of version 4+, newest first.
fn versioned_installs(dir: &Path) -> Vec<(u32, PathBuf)> {
    let mut found: Vec<(u32, PathBuf)> = fs::read_dir(dir)
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            if !name.starts_with("MuseScore") {
                return None;
            }
            let major = major_version_in(&name)?;
            (major >= 4).then(|| (major, entry.path()))
        })
        .collect();
    found.sort_by(|a, b| b.0.cmp(&a.0));
    found
}

#[cfg(target_os = "windows")]
fn platform_candidates() -> Vec<PathBuf> {
    let mut roots: Vec<PathBuf> = ["ProgramW6432", "ProgramFiles", "ProgramFiles(x86)"]
        .iter()
        .filter_map(|var| std::env::var_os(var).map(PathBuf::from))
        .collect();
    if let Some(local) = std::env::var_os("LOCALAPPDATA") {
        roots.push(PathBuf::from(local).join("Programs"));
    }

    let mut candidates = Vec::new();
    for root in roots {
        for (major, install) in versioned_installs(&root) {
            let bin = install.join("bin");
            candidates.push(bin.join(format!("MuseScore{major}.exe")));
            // Any other MuseScore*.exe in bin, in case the exe gets renamed.
            for entry in fs::read_dir(&bin).into_iter().flatten().flatten() {
                let name = entry.file_name().to_string_lossy().to_lowercase();
                if name.starts_with("musescore") && name.ends_with(".exe") {
                    candidates.push(entry.path());
                }
            }
        }
    }
    candidates
}

#[cfg(target_os = "macos")]
fn platform_candidates() -> Vec<PathBuf> {
    let mut roots = vec![PathBuf::from("/Applications")];
    if let Some(home) = std::env::var_os("HOME") {
        roots.push(PathBuf::from(home).join("Applications"));
    }
    roots
        .iter()
        .flat_map(|root| versioned_installs(root))
        .map(|(_, app)| app.join("Contents/MacOS/mscore"))
        .collect()
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn platform_candidates() -> Vec<PathBuf> {
    Vec::new() // Linux installs are found on PATH (AppImage / distro / flatpak wrapper)
}

/// Executables on PATH whose major version we can't infer from an install dir.
fn path_candidates() -> Vec<PathBuf> {
    let names = [
        "MuseScore4",
        "mscore4portable",
        "musescore4",
        "mscore4",
        "musescore",
        "mscore",
    ];
    let exts: &[&str] = if cfg!(windows) { &[".exe"] } else { &[""] };
    let Some(path) = std::env::var_os("PATH") else {
        return Vec::new();
    };
    std::env::split_paths(&path)
        .flat_map(|dir| {
            names
                .iter()
                .flat_map(|name| exts.iter().map(move |ext| format!("{name}{ext}")))
                .map(move |file| dir.join(file))
        })
        .collect()
}

/// Ask an executable its version; accept only MuseScore 4+ (3.x can't read 4.x files).
fn reports_musescore_4_plus(exe: &Path) -> bool {
    let mut cmd = Command::new(exe);
    cmd.arg("--version")
        .stdin(Stdio::null())
        .stderr(Stdio::null());
    hide_console(&mut cmd);
    let Ok(out) = cmd.output() else {
        return false;
    };
    // e.g. "MuseScore4 4.7.5"
    let text = String::from_utf8_lossy(&out.stdout);
    text.split_whitespace()
        .last()
        .and_then(major_version_in)
        .is_some_and(|major| major >= 4)
}

// Positive results only: if MuseScore gets installed mid-session we'll find it
// on the next chart, without paying the PATH probe on every call.
static FOUND: Mutex<Option<PathBuf>> = Mutex::new(None);

pub fn find_musescore() -> Option<PathBuf> {
    if let Some(found) = FOUND.lock().unwrap().clone() {
        if found.is_file() {
            return Some(found);
        }
    }

    let found = std::env::var_os(PATH_ENV_VAR)
        .map(PathBuf::from)
        .filter(|p| p.is_file())
        .or_else(|| platform_candidates().into_iter().find(|p| p.is_file()))
        .or_else(|| {
            path_candidates()
                .into_iter()
                .find(|p| p.is_file() && reports_musescore_4_plus(p))
        });

    *FOUND.lock().unwrap() = found.clone();
    found
}

// ── Running the converter ────────────────────────────────────────────────────

fn hide_console(cmd: &mut Command) {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    cmd.env("QT_QPA_PLATFORM", "offscreen"); // no display needed on Linux
    #[cfg(target_os = "macos")]
    let _ = cmd;
}

/// Last few KB of a log file, for error messages.
fn log_tail(path: &Path) -> String {
    const TAIL: u64 = 4096;
    let Ok(mut file) = File::open(path) else {
        return String::new();
    };
    let len = file.metadata().map(|m| m.len()).unwrap_or(0);
    let _ = file.seek(SeekFrom::Start(len.saturating_sub(TAIL)));
    let mut buf = Vec::new();
    let _ = file.read_to_end(&mut buf);
    String::from_utf8_lossy(&buf).trim().to_string()
}

/// Run the converter to completion. Output goes to a log file rather than a
/// pipe: MuseScore logs a lot, and an undrained pipe would block it.
fn run_converter<I, S>(exe: &Path, args: I, work: &Path, label: &str) -> Result<(), String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    let log_path = work.join(format!("{label}.log"));
    let log = File::create(&log_path).map_err(|e| e.to_string())?;
    let log_err = log.try_clone().map_err(|e| e.to_string())?;

    let mut cmd = Command::new(exe);
    cmd.args(args)
        .current_dir(work)
        .stdin(Stdio::null())
        .stdout(log)
        .stderr(log_err);
    hide_console(&mut cmd);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("couldn't start MuseScore ({}): {e}", exe.display()))?;

    let deadline = Instant::now() + CONVERTER_TIMEOUT;
    let status = loop {
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            break status;
        }
        if Instant::now() > deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err(format!(
                "MuseScore {label} timed out after {CONVERTER_TIMEOUT:?}"
            ));
        }
        std::thread::sleep(Duration::from_millis(100));
    };

    if !status.success() {
        return Err(format!(
            "MuseScore {label} failed ({status}):\n{}",
            log_tail(&log_path)
        ));
    }
    Ok(())
}

/// Scratch dir removed on drop, whatever happens mid-bake.
struct WorkDir(PathBuf);

impl WorkDir {
    fn new() -> Result<Self, String> {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let dir =
            std::env::temp_dir().join(format!("fletcher-musescore-{}-{nanos}", std::process::id()));
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        Ok(Self(dir))
    }
}

impl Drop for WorkDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn read_text(path: &Path) -> Result<String, String> {
    fs::read_to_string(path)
        .map_err(|e| format!("missing MuseScore output {}: {e}", path.display()))
}

/// Collect `<stem>-1.svg`, `<stem>-2.svg`, … (the converter's page-by-page naming).
fn read_pages(work: &Path, stem: &str) -> Result<Vec<String>, String> {
    let mut pages = Vec::new();
    for page in 1.. {
        let path = work.join(format!("{stem}-{page}.svg"));
        if !path.is_file() {
            break;
        }
        pages.push(read_text(&path)?);
    }
    if pages.is_empty() {
        let single = work.join(format!("{stem}.svg"));
        if single.is_file() {
            pages.push(read_text(&single)?);
        }
    }
    Ok(pages)
}

fn read_view(work: &Path, stem: &str, name: String) -> Result<RenderedView, String> {
    Ok(RenderedView {
        name,
        pages: read_pages(work, stem)?,
        mpos: read_text(&work.join(format!("{stem}.mpos")))?,
    })
}

fn path_str(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

// MuseScore 4.7 bug: a TAB staff type saved with `<showRests>0</showRests>`
// (the default for guitar-style "Simple" TAB presets — rests just aren't
// drawn on the tab, which is normal engraving practice) stops the *notation*
// staff linked to it from drawing rest glyphs too, from the second system
// onward. Every measure still has its `<Rest>`, it just goes invisible —
// both staves render blank past the first line, as if the part vanished.
// `showRests=1` (what non-"Simple" TAB presets already default to, e.g. the
// bundled bass preset) doesn't trip the bug, so we flip it in a scratch copy
// before baking. The only visible cost is TAB rests become visible too,
// which is a far smaller change than losing the staff's content.
fn patch_show_rests(mscz: &[u8]) -> Result<Vec<u8>, String> {
    let mut archive =
        ZipArchive::new(Cursor::new(mscz)).map_err(|e| format!("unreadable .mscz: {e}"))?;
    let mut out = ZipWriter::new(Cursor::new(Vec::new()));
    let options = SimpleFileOptions::default();

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry
            .name()
            .map_err(|e| format!("bad zip entry name: {e}"))?
            .into_owned();
        let mut bytes = Vec::new();
        entry.read_to_end(&mut bytes).map_err(|e| e.to_string())?;

        if name.ends_with(".mscx") {
            if let Ok(text) = String::from_utf8(bytes.clone()) {
                bytes = text
                    .replace("<showRests>0</showRests>", "<showRests>1</showRests>")
                    .into_bytes();
            }
        }

        out.start_file(&name, options).map_err(|e| e.to_string())?;
        out.write_all(&bytes).map_err(|e| e.to_string())?;
    }

    out.finish()
        .map_err(|e| e.to_string())
        .map(|cursor| cursor.into_inner())
}

fn bake(exe: &Path, mscz_path: &Path) -> Result<MuseScoreBake, String> {
    let _guard = BAKE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let work = WorkDir::new()?;
    let dir = &work.0;

    // A private copy: plain ASCII path for the converter, immune to the user
    // re-saving the chart mid-bake, and with the showRests bug worked around.
    let score = dir.join("score.mscz");
    let original =
        fs::read(mscz_path).map_err(|e| format!("couldn't read {}: {e}", mscz_path.display()))?;
    let patched = patch_show_rests(&original)?;
    fs::write(&score, patched).map_err(|e| e.to_string())?;

    // Pass 1: split into standalone part files.
    let parts_json = dir.join("parts.json");
    run_converter(
        exe,
        [
            OsStr::new("-f"),
            OsStr::new("--score-parts"),
            OsStr::new("-o"),
            parts_json.as_os_str(),
            score.as_os_str(),
        ],
        dir,
        "parts",
    )?;
    let parts: ScoreParts = serde_json::from_str(&read_text(&parts_json)?)
        .map_err(|e| format!("unreadable --score-parts output: {e}"))?;

    let mut job = vec![serde_json::json!({
        "in": path_str(&score),
        "out": [
            path_str(&dir.join("full.svg")),
            path_str(&dir.join("full.mpos")),
            path_str(&dir.join("full.musicxml")),
        ],
    })];
    for (i, b64) in parts.parts_bin.iter().enumerate() {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(b64)
            .map_err(|e| format!("bad part data for part {i}: {e}"))?;
        let part = dir.join(format!("part-{i}.mscz"));
        fs::write(&part, bytes).map_err(|e| e.to_string())?;
        job.push(serde_json::json!({
            "in": path_str(&part),
            "out": [
                path_str(&dir.join(format!("part-{i}.svg"))),
                path_str(&dir.join(format!("part-{i}.mpos"))),
            ],
        }));
    }
    let job_path = dir.join("job.json");
    fs::write(&job_path, serde_json::to_string(&job).unwrap()).map_err(|e| e.to_string())?;

    // Pass 2: render everything in one process launch.
    run_converter(
        exe,
        [
            OsStr::new("-f"),
            OsStr::new("-r"),
            OsStr::new(POSITIONS_DPI),
            OsStr::new("-j"),
            job_path.as_os_str(),
        ],
        dir,
        "render",
    )?;

    let full = read_view(dir, "full", "Full Score".into())?;
    if full.pages.is_empty() {
        return Err(format!(
            "MuseScore produced no pages:\n{}",
            log_tail(&dir.join("render.log"))
        ));
    }
    let parts = parts
        .parts
        .into_iter()
        .enumerate()
        .map(|(i, name)| read_view(dir, &format!("part-{i}"), name))
        .collect::<Result<Vec<_>, _>>()?;

    Ok(MuseScoreBake {
        full,
        parts,
        music_xml: read_text(&dir.join("full.musicxml"))?,
    })
}

// ── Commands ─────────────────────────────────────────────────────────────────

/// The MuseScore executable charts will be rendered with, or null if none is installed.
#[tauri::command]
pub async fn musescore_path() -> Option<String> {
    tauri::async_runtime::spawn_blocking(find_musescore)
        .await
        .ok()
        .flatten()
        .map(|p| path_str(&p))
}

/// Render a .mscz with MuseScore: full score + every part, as raw SVG/.mpos/MusicXML.
#[tauri::command]
pub async fn musescore_bake(mscz_path: String) -> Result<MuseScoreBake, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let exe = find_musescore().ok_or("MuseScore 4 is not installed")?;
        bake(&exe, Path::new(&mscz_path))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_major_versions() {
        assert_eq!(major_version_in("MuseScore 4"), Some(4));
        assert_eq!(major_version_in("MuseScore Studio 5.app"), Some(5));
        assert_eq!(major_version_in("4.7.5"), Some(4));
        assert_eq!(major_version_in("MuseScore"), None);
    }

    fn zip_with(files: &[(&str, &str)]) -> Vec<u8> {
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        for (name, contents) in files {
            writer
                .start_file(*name, SimpleFileOptions::default())
                .unwrap();
            writer.write_all(contents.as_bytes()).unwrap();
        }
        writer.finish().unwrap().into_inner()
    }

    fn file_contents(zip: &[u8], name: &str) -> String {
        let mut archive = ZipArchive::new(Cursor::new(zip)).unwrap();
        let mut out = String::new();
        archive
            .by_name(name)
            .unwrap()
            .read_to_string(&mut out)
            .unwrap();
        out
    }

    #[test]
    fn patch_show_rests_flips_only_tab_staff_rests() {
        let mscx = "<StaffType group=\"tablature\"><showRests>0</showRests></StaffType>\
                    <StaffType group=\"pitched\"><showRests>1</showRests></StaffType>";
        let zip = zip_with(&[
            ("score.mscx", mscx),
            ("score_style.mss", "<showRests>0</showRests>"),
        ]);

        let patched = patch_show_rests(&zip).unwrap();

        assert_eq!(
            file_contents(&patched, "score.mscx"),
            "<StaffType group=\"tablature\"><showRests>1</showRests></StaffType>\
             <StaffType group=\"pitched\"><showRests>1</showRests></StaffType>",
        );
        // Non-.mscx entries (e.g. the style sheet) are left untouched.
        assert_eq!(
            file_contents(&patched, "score_style.mss"),
            "<showRests>0</showRests>"
        );
    }

    // End-to-end against a real install:
    //   FLETCHER_TEST_MSCZ=path/to/chart.mscz cargo test -- --ignored
    #[test]
    #[ignore = "needs MuseScore 4 installed and FLETCHER_TEST_MSCZ set"]
    fn bakes_a_real_score() {
        let mscz = std::env::var("FLETCHER_TEST_MSCZ").expect("set FLETCHER_TEST_MSCZ");
        let exe = find_musescore().expect("MuseScore 4 not found");
        let started = Instant::now();
        let result = bake(&exe, Path::new(&mscz)).unwrap();

        assert!(!result.full.pages.is_empty());
        assert!(result.full.mpos.contains("<element "));
        assert!(result.music_xml.contains("score-partwise"));
        for part in &result.parts {
            assert!(!part.pages.is_empty(), "part {} has no pages", part.name);
            assert!(
                part.mpos.contains("<event "),
                "part {} has no events",
                part.name
            );
        }
        eprintln!(
            "baked with {}: {} full page(s), parts {:?} in {:?}",
            exe.display(),
            result.full.pages.len(),
            result
                .parts
                .iter()
                .map(|p| (&p.name, p.pages.len()))
                .collect::<Vec<_>>(),
            started.elapsed(),
        );
    }
}
