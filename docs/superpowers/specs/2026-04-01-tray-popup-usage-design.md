# Tray Popup Window with Usage Display - Design

Date: 2026-04-01

## Overview

Replace the native macOS system tray menu with a popup window that includes:
- App navigation (Claude / Codex / Gemini)
- Provider switching with 5-hour usage percentage
- Real-time ZenMux quota display with progress bars

## UI Structure

### 1. Navigation Bar (Top)
Three tabs: Claude | Codex | Gemini

- Height: 36px
- Background: #1a1a1a
- Active tab: #4a9eff background, white text
- Inactive tab: transparent background, #888 text

### 2. Provider List
Shows providers for the selected app type.

Each provider item displays:
- Provider icon (colored square, 20x20px)
- Provider name
- **5-hour usage percentage** (new feature)
- Checkmark for current selection

### 3. Usage Display (ZenMux API Data)
Fetches from `GET /api/v1/management/subscription/detail`

Displays:

| Field | Description |
|-------|-------------|
| 5-Hour Window | usage_percentage, used_flows, max_flows, used_value_usd, max_value_usd |
| 7-Day Window | Same fields as above |
| Monthly Quota | max_flows, max_value_usd (no real-time usage) |
| Account Status | healthy / monitored / abusive / suspended / banned |
| Plan Tier | free / pro / max / ultra |
| Flow Rate | effective_usd_per_flow |

### 4. Action Buttons (Bottom)
- "Open main window" - Opens the main application window
- "Quit" - Exits the application

## Color Scheme

### Usage Percentage Colors
Based on usage_percentage (0-1 scale):

| Range | Color |
|-------|-------|
| 0-0.3 (0-30%) | #10b981 (green) |
| 0.3-0.7 (30-70%) | #f59e0b (yellow) |
| 0.7-1.0 (70-100%) | #ef4444 (red) |

### Progress Bar Colors
Apply the same color rules to progress bars.

## Data Flow

### Authentication
Reuse the existing "Configure Usage Query" Management API Key stored in provider settings.

### API Endpoints

```
GET https://zenmux.ai/api/v1/management/subscription/detail
Authorization: Bearer <ZENMUX_MANAGEMENT_API_KEY>
```

### Response Data Mapping

```typescript
interface SubscriptionDetail {
  plan: {
    tier: string;        // "ultra"
    amount_usd: number;
    interval: string;
    expires_at: string;
  };
  currency: string;      // "usd"
  base_usd_per_flow: number;
  effective_usd_per_flow: number;
  account_status: string; // "healthy"
  quota_5_hour: {
    usage_percentage: number;
    resets_at: string | null;
    max_flows: number;
    used_flows: number;
    remaining_flows: number;
    used_value_usd: number;
    max_value_usd: number;
  };
  quota_7_day: { /* same structure */ };
  quota_monthly: {
    max_flows: number;
    max_value_usd: number;
  };
}
```

## Technical Implementation

### 1. Frontend (React + Tauri)
- Create new popup window component
- Use existing UI components (tabs, buttons, progress bars)
- Add ZenMux API service for fetching subscription detail

### 2. Backend (Rust/Tauri)
- Add new Tauri command to fetch subscription detail from ZenMux API
- Store/retrieve Management API Key from settings
- Handle authentication errors

### 3. Window Behavior
- **Show**: Click tray icon → popup window appears below/around icon
- **Hide**: Click outside window OR click tray icon again
- **Toggle**: Click tray icon toggles visibility

### 4. Tray Icon Update
- Keep existing icon
- Same click behavior as before

## Component List

### New Components
1. `TrayPopup.tsx` - Main popup window container
2. `AppNavBar.tsx` - Navigation tabs (Claude/Codex/Gemini)
3. `ProviderList.tsx` - Provider list with usage percentage
4. `UsageDisplay.tsx` - ZenMux quota display with progress bars
5. `ActionBar.tsx` - Bottom action buttons

### New Backend Commands
1. `fetch_zenmux_subscription` - Call ZenMux Management API

### Updated Files
1. `src-tauri/src/tray.rs` - Replace menu with window show
2. `src-tauri/src/commands/usage.rs` - Add new command

## Error Handling

| Error | Handling |
|-------|----------|
| No API Key configured | Show "Configure Usage Query" prompt |
| API call failed | Show error message, allow retry |
| Invalid API Key | Show error, prompt to reconfigure |
| Network error | Show offline state, use cached data |

## Acceptance Criteria

1. ✓ Click tray icon shows popup window
2. ✓ Can switch between Claude/Codex/Gemini tabs
3. ✓ Can switch provider in the list
4. ✓ Each provider shows 5-hour usage percentage
5. ✓ Usage display shows 5-Hour, 7-Day, Monthly data
6. ✓ Progress bars use correct colors based on usage
7. ✓ Account status and plan info displayed
8. ✓ Open Main Window button works
9. ✓ Quit button works
10. ✓ Click outside hides window
11. ✓ Window appears near tray icon position