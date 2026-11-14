# KeyClick Tracker

A privacy-first Windows app that counts your key presses, mouse clicks and scrolling, and turns them into calm, live statistics: typing speed (WPM), click rate (CPM), records, goals and an experience level.

**It never stores what you type.** The app records *which* key (for example "A" or "Space") and how many times, never the order, the text, passwords, clipboard contents, cursor positions, window titles or screenshots. Nothing leaves your computer.

## Features

- **Live counters** for key presses, mouse clicks, and scrolls, with sliding digits.
- **Speed:** overall and average WPM and CPM, plus peak minutes. Choose units: WPS / WPM / WPH and CPS / CPM / CPH.
- **Overview:** a greeting that follows your computer's clock, a name box, and a 12h/24h clock (click it to switch).
- **Experience level** from the events you make.
- **All-time records:** most pressed key, most used mouse button, most scrolled direction, busiest day, fastest typing and clicking days.
- **Floating live box** (Settings): a small rounded box with live WPM and CPM that stays on top of every window, even while the app is in the tray. Drag it to any corner, resize it from its corner, hover and press ✕ to close.
- **30 colour themes** and **15 font families**, applied instantly.
- **Import and export** in JSON, TXT and Markdown (CSV for spreadsheets). Imports merge safely and never double-count.
- **Goals, streaks, heatmaps, milestones**, break reminders, and start-with-Windows.
- **Your history is protected:** a backup is made before the first run of a new version, before imports or clearing, and once a day.

## Requirements

- Windows 10 or 11, 64-bit.
- To run: nothing else. The app uses the WebView2 runtime, which ships with current Windows 10/11.
- To build: Go (see `go.mod`) and MinGW `windres` on the PATH.

## Build

From `Native-Windows-Source`:

```powershell
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

`build.ps1` regenerates the icon from `logo-source.png` and the Windows resources from `app.rc`, then builds a single `KeyClick-Tracker-v<version>.exe` into the parent folder.

## Where your data lives

- Data: `%LOCALAPPDATA%\KeyScope\activity.json` (the folder keeps its original name for compatibility).
- Backups: `%LOCALAPPDATA%\KeyScope\Backups\`.
- Log: `%LOCALAPPDATA%\KeyScope\keyscope.log`.

## Repository layout

- `Native-Windows-Source/` - the app: Go host (keyboard and mouse hooks, tray, window, local server), and the web UI in `ui/`.
- `Original-Dashboard-Source/` - the original KeyScope React/Next.js dashboard, kept for reference. It is not part of the current build.

## Release history

See the GitHub Releases page. The in-app update log page lists every version.

## Status

Personal project. Windows-only.
