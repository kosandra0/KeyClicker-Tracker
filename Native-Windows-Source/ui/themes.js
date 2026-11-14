/* KeyClick Tracker: 30 themes and 15 fonts.
   Each theme: [id, name, mode, bg, sidebar, panel, panel2, ink, muted, line, accent, accent2]
   All are calm, low-saturation palettes. The first one is the original KeyScope look. */
window.KC_THEMES = [
  ['classic',   'Midnight Slate',  'dark',  '#16171b', '#1b1c21', '#1f2026', '#23242b', '#f0f0f1', '#92949e', '#2e3038', '#91a8e6', '#a99be4'],
  ['lamp',      'Amber Lamp',      'dark',  '#1a1613', '#1f1a16', '#241e19', '#2a231d', '#f3ece4', '#a39484', '#362d25', '#e2b05f', '#cf8a5f'],
  ['forest',    'Forest Night',    'dark',  '#121715', '#161d1a', '#1b2420', '#202b26', '#e8f0ec', '#8da197', '#2a3832', '#7cc3a0', '#a3c97d'],
  ['ocean',     'Deep Ocean',      'dark',  '#111820', '#151e28', '#1a2531', '#1f2c3a', '#e6eef6', '#8a9cb0', '#283747', '#6fb1e0', '#7f9bea'],
  ['aubergine', 'Aubergine',       'dark',  '#1a141c', '#1f1822', '#251d29', '#2b2230', '#f1e9f3', '#a493aa', '#382c3d', '#c79be0', '#e08fb4'],
  ['graphite',  'Graphite',        'dark',  '#18181a', '#1d1d20', '#222226', '#28282d', '#ececee', '#98989f', '#33333a', '#b9b9c6', '#8ea0b8'],
  ['coffee',    'Coffee House',    'dark',  '#1b1511', '#211a15', '#271f19', '#2e251e', '#f2e8dc', '#a8967f', '#3b2f25', '#d4a373', '#b98b6a'],
  ['nordic',    'Nordic Night',    'dark',  '#1c2029', '#212631', '#272d3a', '#2d3441', '#e5e9f0', '#8f9bb0', '#353d4d', '#88c0d0', '#81a1c1'],
  ['rosewood',  'Rosewood',        'dark',  '#1c1416', '#221a1c', '#282022', '#2f2528', '#f3e8ea', '#a8929a', '#3c2e32', '#e08a9a', '#d4a373'],
  ['olive',     'Olive Grove',     'dark',  '#171911', '#1c1f15', '#22251a', '#282c1f', '#eef0e2', '#9aa088', '#33382a', '#b5c26b', '#8fb58a'],
  ['teal',      'Teal Harbor',     'dark',  '#11191a', '#151f20', '#1a2627', '#1f2d2f', '#e6f1f1', '#89a3a4', '#27393a', '#5fc0c0', '#6fa8dc'],
  ['navy',      'Navy Ledger',     'dark',  '#101828', '#141f33', '#19263d', '#1e2d48', '#e8edf7', '#8c9bb5', '#27385a', '#d8b46a', '#7fa0dc'],
  ['storm',     'Storm Cloud',     'dark',  '#2a303b', '#303745', '#363e4d', '#3c4555', '#eceff4', '#a0aabb', '#475164', '#8fb4e8', '#b39ddb'],
  ['walnut',    'Walnut',          'dark',  '#2b221b', '#31281f', '#382e25', '#3f342a', '#f1e6d8', '#b09c85', '#4d3f32', '#e0b074', '#c98f5a'],
  ['moss',      'Deep Moss',       'dark',  '#141a14', '#192019', '#1e271e', '#243024', '#e9f1e7', '#8fa38b', '#2d3c2d', '#93c47d', '#6fb59a'],
  ['parchment', 'Parchment',       'light', '#f4f1ea', '#eeeae1', '#fbf9f5', '#f1ede4', '#2a2723', '#867f73', '#e1dbcf', '#b5653a', '#8c6a3f'],
  ['paper',     'Paper White',     'light', '#f6f6f4', '#efefec', '#ffffff', '#f3f3f0', '#202124', '#7a7c82', '#e4e4e0', '#4a6fd1', '#7a5fd0'],
  ['linen',     'Linen',           'light', '#f5f0e8', '#efe8dc', '#fcfaf6', '#f3ece1', '#2d2822', '#8a7f70', '#e4dbcb', '#8a6d3b', '#a8683a'],
  ['sage',      'Sage',            'light', '#f0f3ee', '#e8ede5', '#f9fbf8', '#eef2eb', '#232a24', '#78857a', '#dbe3d7', '#5d8a6b', '#7a9a5a'],
  ['sky',       'Sky Morning',     'light', '#eff4f8', '#e6eef5', '#fafcfe', '#edf3f8', '#1f2933', '#738496', '#d9e4ee', '#3f7fc0', '#6a8fd8'],
  ['quartz',    'Rose Quartz',     'light', '#f8f0f1', '#f2e7e9', '#fdf9fa', '#f6ecee', '#2c2124', '#8f7880', '#ebdadd', '#c0566b', '#b9788a'],
  ['lavender',  'Lavender Mist',   'light', '#f2f0f8', '#eae7f3', '#fbfaff', '#f0edf8', '#25222f', '#7f7a94', '#dfdaee', '#7a63c8', '#9a7fd0'],
  ['peach',     'Peach Cream',     'light', '#fbf1ea', '#f5e8de', '#fffaf6', '#f8ece3', '#2f2420', '#96796b', '#eddccf', '#d0703f', '#c98a4b'],
  ['mint',      'Mint Cream',      'light', '#eef6f3', '#e4efeb', '#f9fdfb', '#ebf4f0', '#1f2b27', '#6f8a80', '#d5e5df', '#2f9e86', '#4aa3b8'],
  ['stone',     'Stone',           'light', '#f1f0ee', '#e9e7e4', '#fafaf9', '#efedea', '#24231f', '#84817a', '#dedbd6', '#6b6458', '#8c7f6a'],
  ['dune',      'Dune',            'light', '#f3ece0', '#ece3d3', '#fbf6ec', '#f1e8d8', '#2c251b', '#8e8068', '#e3d8c3', '#b88746', '#a8704a'],
  ['harbor',    'Harbor',          'light', '#edf1f6', '#e4eaf1', '#f9fbfd', '#ebeff5', '#1d2530', '#6f7d8f', '#d6dee8', '#2e5d94', '#4a78b0'],
  ['terracotta','Terracotta',      'light', '#f6ede7', '#efe3da', '#fcf7f3', '#f3e8e0', '#2e2019', '#94776a', '#e6d4c8', '#b8553a', '#c9795a'],
  ['periwinkle','Periwinkle Day',  'light', '#f3f4f9', '#eaecf5', '#fbfbfe', '#eff0f8', '#23253a', '#787c97', '#dfe1ee', '#5b73c9', '#8a73c9'],
  ['sepia',     'Sepia Study',     'light', '#e9dfcc', '#e1d6c0', '#f3ebdb', '#e8ddc8', '#3a2e1e', '#8c7a5c', '#d6c9ae', '#8a5a2b', '#6f7f4a']
];

/* Fonts that ship with Windows 10/11 (nothing is downloaded). */
window.KC_FONTS = [
  ['segoe',      'Segoe UI',            '"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif'],
  ['calibri',    'Calibri',             'Calibri,"Segoe UI",sans-serif'],
  ['candara',    'Candara',             'Candara,"Segoe UI",sans-serif'],
  ['corbel',     'Corbel',              'Corbel,"Segoe UI",sans-serif'],
  ['verdana',    'Verdana',             'Verdana,"Segoe UI",sans-serif'],
  ['trebuchet',  'Trebuchet MS',        '"Trebuchet MS","Segoe UI",sans-serif'],
  ['georgia',    'Georgia',             'Georgia,"Times New Roman",serif'],
  ['times',      'Times New Roman',     '"Times New Roman",Times,serif'],
  ['cambria',    'Cambria',             'Cambria,Georgia,serif'],
  ['constantia', 'Constantia',          'Constantia,Georgia,serif'],
  ['palatino',   'Palatino Linotype',   '"Palatino Linotype",Palatino,"Book Antiqua",serif'],
  ['comic',      'Comic Sans MS',       '"Comic Sans MS","Comic Neue",cursive'],
  ['inkfree',    'Ink Free',            '"Ink Free","Segoe Print",cursive'],
  ['segoeprint', 'Segoe Print',         '"Segoe Print","Ink Free",cursive'],
  ['consolas',   'Consolas',            'Consolas,"Cascadia Mono","Courier New",monospace']
];
