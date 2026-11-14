KEYSCOPE - RESTORED WINDOWS DESKTOP BUILD
=========================================

This is the native Windows monitoring host and its embedded dashboard UI.
The embedded dashboard uses the same visual direction as the original Arena
preview: dark neutral surfaces, rounded cards, a compact sidebar, subtle
transitions, analytics pages and monitoring status.

BUILD
-----
Requirements:
- Go 1.23 or newer
- Windows 10/11 x64
- Microsoft Edge installed (used in app-window mode to render the dashboard)

Run build-windows.bat. The executable is written to the parent package folder.

RUN
---
Double-click KeyScope.exe. The native process installs global low-level input
hooks, creates a system-tray icon, starts a loopback-only local API, and opens
the dashboard in a dedicated Microsoft Edge app window (no tabs or address bar).
The app window is rendered by Edge; the monitoring and tray host remain native.

The dashboard is bundled into KeyScope.exe. No Node.js, PostgreSQL, Rust,
network connection or development server is required on the target PC.

DATA
----
%LOCALAPPDATA%\KeyScope\activity.json
%LOCALAPPDATA%\KeyScope\keyscope.log
%LOCALAPPDATA%\KeyScope\WebViewProfile\

PRIVACY
-------
Only aggregate counts and identifiers are stored: key identifiers, mouse-button
identifiers, scroll direction, hourly time buckets and counts. No typed text,
passwords, clipboard contents, key sequences, cursor coordinates or screenshots
are recorded. Input hooks ignore injected events.

TRAY
----
The KeyScope tray icon has Open KeyScope, Pause/Resume Monitoring, and Exit
KeyScope commands. The Settings page controls whether closing the dashboard
leaves monitoring running in the tray or exits the host after the window closes.

IMPORTANT LIMITATIONS
--------------------
- This is a portable desktop build, not an installer.
- The UI is a self-contained HTML/CSS/JavaScript desktop dashboard built to
  restore the intended Arena-style visual experience. The original React /
  Next.js source is also included unchanged in Original-Dashboard-Source.
- The original Next.js application was not compiled into this executable; this
  embedded interface uses the native host's local API and JSON aggregate store.
- Edge app mode is used as the window renderer. If Edge is unavailable, the app
  falls back to the system default browser.
- Test the executable on Windows. The build host used for this package is Linux,
  so Windows runtime behavior cannot be exercised in this environment.
