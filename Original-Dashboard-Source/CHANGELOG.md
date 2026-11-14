# Changelog

## 1.0.0

### Added
- Analytics web app (Next.js + PostgreSQL): Overview, Keyboard, Mouse, History, Reports, Settings, About.
- Hourly aggregate schema (`input_counts`, `app_settings`) and transactional batched ingest API.
- Time filtering: 14 range presets + custom, hourly → yearly aggregation, time-zone aware SQL.
- CSV/JSON exports; delete-range / delete-all; global pause/resume.
- `keyscope-agent` Rust source for Windows low-level hooks (**uncompiled, unverified**).

### Not done
- Tauri 2 shell, system tray, close behavior, auto-start, SQLite, installer, Windows executable.
