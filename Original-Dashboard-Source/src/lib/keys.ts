// Stable key identifiers follow the W3C `KeyboardEvent.code` vocabulary
// (physical key positions). The native Windows agent emits the same ids.

export function keyLabel(code: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^F\d{1,2}$/.test(code)) return code;
  if (/^Numpad\d$/.test(code)) return `Num ${code.slice(6)}`;
  const map: Record<string, string> = {
    Escape: "Esc",
    Backquote: "` ~",
    Minus: "- _",
    Equal: "= +",
    Backspace: "Backspace",
    Tab: "Tab",
    BracketLeft: "[ {",
    BracketRight: "] }",
    Backslash: "\\ |",
    CapsLock: "Caps Lock",
    Semicolon: "; :",
    Quote: "' \"",
    Enter: "Enter",
    ShiftLeft: "Left Shift",
    ShiftRight: "Right Shift",
    Comma: ", <",
    Period: ". >",
    Slash: "/ ?",
    ControlLeft: "Left Ctrl",
    ControlRight: "Right Ctrl",
    AltLeft: "Left Alt",
    AltRight: "Right Alt",
    MetaLeft: "Left Win",
    MetaRight: "Right Win",
    ContextMenu: "Menu",
    Space: "Space",
    PrintScreen: "Print Screen",
    ScrollLock: "Scroll Lock",
    Pause: "Pause/Break",
    Insert: "Insert",
    Delete: "Delete",
    Home: "Home",
    End: "End",
    PageUp: "Page Up",
    PageDown: "Page Down",
    ArrowUp: "Arrow Up",
    ArrowDown: "Arrow Down",
    ArrowLeft: "Arrow Left",
    ArrowRight: "Arrow Right",
    NumLock: "Num Lock",
    NumpadDivide: "Num /",
    NumpadMultiply: "Num *",
    NumpadSubtract: "Num -",
    NumpadAdd: "Num +",
    NumpadEnter: "Num Enter",
    NumpadDecimal: "Num .",
    IntlBackslash: "Intl \\",
    Unknown: "Other",
  };
  if (map[code]) return map[code];
  if (code.startsWith("VK_")) return `Key 0x${code.slice(3)}`;
  return code;
}

export type KeyCategory =
  | "Letters"
  | "Numbers"
  | "Function"
  | "Modifiers"
  | "Navigation"
  | "Numpad"
  | "Punctuation"
  | "Editing & Space"
  | "Other";

export function isModifier(code: string): boolean {
  return /^(Shift|Control|Alt|Meta)(Left|Right)$/.test(code);
}

export function keyCategory(code: string): KeyCategory {
  if (/^Key[A-Z]$/.test(code)) return "Letters";
  if (/^Digit\d$/.test(code)) return "Numbers";
  if (/^F\d{1,2}$/.test(code)) return "Function";
  if (isModifier(code)) return "Modifiers";
  if (code.startsWith("Numpad") || code === "NumLock") return "Numpad";
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "PageUp",
      "PageDown",
      "Escape",
      "PrintScreen",
      "ScrollLock",
      "Pause",
    ].includes(code)
  )
    return "Navigation";
  if (
    [
      "Backquote",
      "Minus",
      "Equal",
      "BracketLeft",
      "BracketRight",
      "Backslash",
      "Semicolon",
      "Quote",
      "Comma",
      "Period",
      "Slash",
      "IntlBackslash",
    ].includes(code)
  )
    return "Punctuation";
  if (
    ["Space", "Enter", "Backspace", "Delete", "Insert", "Tab", "CapsLock", "ContextMenu"].includes(
      code,
    )
  )
    return "Editing & Space";
  return "Other";
}

export const MOUSE_LABELS: Record<string, string> = {
  left: "Left button",
  right: "Right button",
  middle: "Middle button",
  x1: "Mouse 4 (Back)",
  x2: "Mouse 5 (Forward)",
};

export const SCROLL_LABELS: Record<string, string> = {
  up: "Scroll up",
  down: "Scroll down",
  left: "Scroll left",
  right: "Scroll right",
};

export const KEY_ID_RE = /^[A-Za-z0-9_]{1,32}$/;
