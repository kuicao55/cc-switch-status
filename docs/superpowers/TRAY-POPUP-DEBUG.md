# Tray Popup Usage

**Status:** merged to `main`

## What It Does

The tray icon now opens a custom popup window instead of the native tray menu.

The popup provides:
- App tabs for Claude, Codex, and Gemini
- Provider switching from the popup
- ZenMux usage and quota overview
- Quick actions to open the main window or quit

## Behavior

- Left-click on the tray icon toggles the popup
- The popup is positioned near the tray icon
- The popup loads `index.html?tray_popup=1` and renders `TrayPopup`
- ZenMux usage data is read from the Management API subscription detail endpoint

## Files Touched

- `src-tauri/src/tray.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/commands/zenmux.rs`
- `src/components/tray-popup/*`
- `src/lib/api/zenmux.ts`
- `src/main.tsx`

## Verification

- `pnpm tauri dev`
- `pnpm typecheck`
- `cargo check`
