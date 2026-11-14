/* Update log shown in the app. Newest first. Add a new entry on every release. */
window.KC_CHANGELOG = [
  {
    version: '1.1.0', date: '2026-11-14', title: 'Live box, levels and a gentler feel',
    intro: 'A floating speed box, a friendlier overview, and a lot more softness in how everything moves.',
    items: [
      ['new', 'Floating live box. A small rounded box with your live speed that stays on top of every window, even while the app is in the tray. Drag it to any corner, pull its bottom-right corner to resize, hover and press ✕ to close. It fades a little when you are not pointing at it and glows back when you are. Turn it on in Settings.'],
      ['new', 'Experience level. A box at the top right shows your level, rank and progress, earned from the events you have made.'],
      ['new', 'Overview: a greeting that follows your computer’s clock (morning, afternoon, evening, night) with a place to type your name, plus a live clock whose digits slide up. Click the clock to switch between 12-hour and 24-hour.'],
      ['new', 'All-time records: most pressed key, most used mouse button, most scrolled direction, busiest day, events made, fastest typing and clicking days, and best minutes.'],
      ['new', 'Measuring units. Show typing speed as WPS, WPM or WPH, and click rate as CPS, CPM or CPH, everywhere including the live box.'],
      ['new', 'Your real KeyClick Tracker logo is now the app, taskbar and tray icon.'],
      ['improved', 'Hover details now appear in a box that matches your theme and font instead of the Windows default tooltip.'],
      ['improved', 'More motion, kept gentle: pages fade and rise, the sidebar marker glides, buttons ripple, switches stretch, cards lift.'],
      ['fixed', 'The WPM and CPM at the top of the window always showed 0. They now update live.'],
      ['fixed', 'Rolling numbers looked ragged in fonts such as Georgia. They now stay aligned in every font.']
    ]
  },
  {
    version: '1.0.0', date: '2026-11-14', title: 'KeyClick Tracker',
    intro: 'KeyScope became KeyClick Tracker, with a calmer look and numbers that move the moment you do.',
    items: [
      ['new', 'Live numbers: key presses, clicks and scrolls climb as you press, click and scroll, with sliding digits.'],
      ['new', 'Typing speed (WPM) and click rate (CPM): live, overall, average and peak, plus a session view and a short typing test.'],
      ['new', 'A macOS-style window with rounded corners and traffic-light buttons on the right.'],
      ['new', '30 hand-tuned colour themes and 15 font families, applied instantly and remembered.'],
      ['new', 'Import and export in JSON, TXT and Markdown, with CSV for spreadsheets. Imports merge safely and never double-count.'],
      ['new', 'Daily goals, streaks, a weekly rhythm heatmap, milestones, break reminders, an update log and start-with-Windows.'],
      ['improved', 'Your history is protected on every update: a backup is made before the first run of a new version, plus a daily snapshot.'],
      ['fixed', '“Yesterday” and the “Previous …” ranges wrongly included everything up to now.'],
      ['fixed', 'A damaged data file is no longer silently replaced with an empty one.'],
      ['fixed', 'Starting the app twice no longer counts every key twice.']
    ]
  },
  {
    version: 'KeyScope', date: 'Before KeyClick Tracker', title: 'KeyScope',
    intro: 'The original desktop release: private counting of key presses, mouse buttons and scrolling.',
    items: [
      ['new', 'Counted keys, mouse buttons and scroll direction without storing what you type.'],
      ['new', 'System tray icon with pause and resume.']
    ]
  }
];
