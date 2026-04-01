# Tray Popup Window with Usage Display - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace native macOS tray menu with a popup window that includes app navigation, provider switching with 5-hour usage percentage, and real-time ZenMux quota display with progress bars.

**Architecture:**
- Create a new small popup window that appears on tray icon click
- Fetch ZenMux subscription data via Management API
- Show providers with 5h usage percentage
- Display quota with color-coded progress bars (green/yellow/red)
- Keep existing click behavior (show/hide on click)

**Tech Stack:** Tauri 2.x, React, Rust

---

## File Structure

```
Frontend (React):
- src/components/tray-popup/TrayPopup.tsx       - NEW: Main popup container
- src/components/tray-popup/AppNavBar.tsx     - NEW: Navigation tabs
- src/components/tray-popup/ProviderList.tsx   - NEW: Provider list
- src/components/tray-popup/UsageDisplay.tsx    - NEW: Usage progress bars

Backend (Rust):
- src-tauri/src/commands/zenmux.rs         - NEW: ZenMux API command
- src-tauri/src/tray.rs                    - MODIFY: Change to show window
- src-tauri/src/lib.rs                    - MODIFY: Window setup
```

---

## Task 1: Create ZenMux API Command

**Files:**
- Create: `src-tauri/src/commands/zenmux.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/commands/usage.rs`

- [ ] **Step 1: Create new file for ZenMux API command**

```rust
// src-tauri/src/commands/zenmux.rs
use crate::error::AppError;
use crate::store::AppState;
use tauri::State;

/// Subscription detail from ZenMux API
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZenmuxSubscription {
    pub plan: PlanInfo,
    pub currency: String,
    pub base_usd_per_flow: f64,
    pub effective_usd_per_flow: f64,
    pub account_status: String,
    pub quota_5_hour: QuotaInfo,
    pub quota_7_day: QuotaInfo,
    pub quota_monthly: QuotaInfo,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PlanInfo {
    pub tier: String,
    pub amount_usd: f64,
    pub interval: String,
    pub expires_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QuotaInfo {
    pub usage_percentage: f64,
    pub resets_at: Option<String>,
    pub max_flows: f64,
    pub used_flows: f64,
    pub remaining_flows: f64,
    pub used_value_usd: f64,
    pub max_value_usd: f64,
}

#[tauri::command]
pub async fn fetch_zenmux_subscription(
    state: State<'_, AppState>,
    api_key: String,
) -> Result<ZenmuxSubscription, AppError> {
    let client = reqwest::Client::new();

    let response = client
        .get("https://zenmux.ai/api/v1/management/subscription/detail")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| AppError::Message(format!("API request failed: {}", e)))?;

    if !response.status().is_success() {
        return Err(AppError::Message(format!(
            "API error: {}",
            response.status()
        )));
    }

    response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| AppError::Message(format!("Failed to parse response: {}", e)))?
        .into()
}
```

- [ ] **Step 2: Add module declaration in mod.rs**

Add to `src-tauri/src/commands/mod.rs`:
```rust
pub mod zenmux;
```

- [ ] **Step 3: Add command registration in lib.rs**

Find where other commands are registered and add:
```rust
.commands(tauri::generate_handler![commands::zenmux::fetch_zenmux_subscription])
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/zenmux.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs
git commit -m "feat(zenmux): add subscription detail API command"
```

---

## Task 2: Create Frontend Tray Popup Components

**Files:**
- Create: `src/components/tray-popup/TrayPopup.tsx`
- Create: `src/components/tray-popup/AppNavBar.tsx`
- Create: `src/components/tray-popup/ProviderList.tsx`
- Create: `src/components/tray-popup/UsageDisplay.tsx`

- [ ] **Step 1: Create TrayPopup container component**

```tsx
// src/components/tray-popup/TrayPopup.tsx
import React, { useState } from "react";
import { AppNavBar } from "./AppNavBar";
import { ProviderList } from "./ProviderList";
import { UsageDisplay } from "./UsageDisplay";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

type AppType = "claude" | "codex" | "gemini";

export function TrayPopup() {
  const [activeApp, setActiveApp] = useState<AppType>("claude");

  const handleOpenMainWindow = async () => {
    try {
      const mainWindow = await getCurrentWindow();
      await mainWindow.show();
      await mainWindow.setFocus();
    } catch (e) {
      console.error("Failed to show main window:", e);
    }
  };

  const handleQuit = async () => {
    await invoke("quit_app");
  };

  return (
    <div className="w-[320px] bg-[#2d2d2d] rounded-xl overflow-hidden text-white">
      <AppNavBar active={activeApp} onChange={setActiveApp} />
      <ProviderList appType={activeApp} />
      <UsageDisplay />
      <div className="flex p-2 gap-2">
        <button
          onClick={handleOpenMainWindow}
          className="flex-1 py-2 border border-[#3d3d3d] rounded-md text-[11px] text-[#888]"
        >
          Open Main Window
        </button>
        <button
          onClick={handleQuit}
          className="py-2 px-3 text-[11px] text-[#666]"
        >
          Quit
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create AppNavBar component**

```tsx
// src/components/tray-popup/AppNavBar.tsx
import React from "react";

type AppType = "claude" | "codex" | "gemini";

interface AppNavBarProps {
  active: AppType;
  onChange: (app: AppType) => void;
}

const tabs: { id: AppType; label: string }[] = [
  { id: "claude", label: "Claude" },
  { id: "codex", label: "Codex" },
  { id: "gemini", label: "Gemini" },
];

export function AppNavBar({ active, onChange }: AppNavBarProps) {
  return (
    <div className="flex bg-[#1a1a1a] p-2 gap-2 border-b border-[#3d3d3d]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-1.5 rounded-md text-[12px] text-center transition-colors ${
            active === tab.id
              ? "bg-[#4a9eff] text-white"
              : "text-[#888] hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create ProviderList component**

```tsx
// src/components/tray-popup/ProviderList.tsx
import React from "react";
import { useProvidersQuery } from "@/lib/query";
import { providersApi } from "@/lib/api/providers";

type AppType = "claude" | "codex" | "gemini";

interface ProviderListProps {
  appType: AppType;
}

// Helper to get usage color based on percentage
function getUsageColor(percentage: number): string {
  if (percentage < 0.3) return "#10b981"; // green
  if (percentage < 0.7) return "#f59e0b"; // yellow
  return "#ef4444"; // red
}

export function ProviderList({ appType }: ProviderListProps) {
  const { data: providers } = useProvidersQuery(appType);

  return (
    <div className="p-2 border-b border-[#3d3d3d]">
      <div className="text-[10px] text-[#666] uppercase mb-2">Provider</div>
      <div className="flex flex-col gap-1">
        {providers?.map((provider) => {
          const isActive = provider.id === providersApi.getCurrentProvider(appType);
          // TODO: Replace with actual 5h usage percentage from API
          const usagePercent = 0.0715;
          const usageColor = getUsageColor(usagePercent);

          return (
            <div
              key={provider.id}
              className={`flex items-center p-2 rounded-md gap-2 ${
                isActive ? "bg-[#3d3d3d]" : ""
              }`}
            >
              <div
                className="w-5 h-5 rounded"
                style={{ backgroundColor: provider.color || "#6366f1" }}
              />
              <span className={`flex-1 text-[12px] ${isActive ? "text-white" : "text-[#888]"}`}>
                {provider.name}
              </span>
              <span
                className="text-[11px] font-medium"
                style={{ color: usageColor }}
              >
                {(usagePercent * 100).toFixed(1)}%
              </span>
              {isActive && <span className="text-[#10b981] text-[10px]">✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create UsageDisplay component with progress bars**

```tsx
// src/components/tray-popup/UsageDisplay.tsx
import React from "react";

function getProgressColor(percentage: number): string {
  if (percentage < 0.3) return "#10b981";
  if (percentage < 0.7) return "#f59e0b";
  return "#ef4444";
}

interface QuotaDisplayProps {
  label: string;
  used: number;
  max: number;
  usedUsd: number;
  maxUsd: number;
}

function QuotaDisplay({ label, used, max, usedUsd, maxUsd }: QuotaDisplayProps) {
  const percentage = max > 0 ? used / max : 0;
  const color = getProgressColor(percentage);

  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-[#aaa]">{label}</span>
        <span className="text-[11px] text-white">
          {used.toLocaleString()} / {max.toLocaleString()} Flows
        </span>
      </div>
      <div className="h-1.5 bg-[#3d3d3d] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage * 100}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-[#666]">
          ${usedUsd.toFixed(2)} / ${maxUsd.toFixed(2)}
        </span>
        <span className="text-[9px]" style={{ color }}>
          {(percentage * 100).toFixed(2)}% used
        </span>
      </div>
    </div>
  );
}

export function UsageDisplay() {
  // TODO: Replace with actual API data
  const subscription = {
    plan: { tier: "ultra" },
    account_status: "healthy",
    base_usd_per_flow: 0.03283,
    quota_5_hour: {
      usage_percentage: 0.0715,
      max_flows: 800,
      used_flows: 57.2,
      used_value_usd: 1.88,
      max_value_usd: 26.27,
    },
    quota_7_day: {
      usage_percentage: 0.0673,
      max_flows: 6182,
      used_flows: 416,
      used_value_usd: 13.66,
      max_value_usd: 202.99,
    },
    quota_monthly: {
      max_flows: 34560,
      max_value_usd: 1134.33,
    },
  };

  const statusColor =
    subscription.account_status === "healthy" ? "#10b981" : "#ef4444";

  return (
    <div className="p-3">
      <div className="text-[10px] text-[#666] uppercase mb-2">
        Real-time Usage (ZenMux)
      </div>

      <QuotaDisplay
        label="5-Hour Window"
        used={subscription.quota_5_hour.used_flows}
        max={subscription.quota_5_hour.max_flows}
        usedUsd={subscription.quota_5_hour.used_value_usd}
        maxUsd={subscription.quota_5_hour.max_value_usd}
      />

      <QuotaDisplay
        label="7-Day Window"
        used={subscription.quota_7_day.used_flows}
        max={subscription.quota_7_day.max_flows}
        usedUsd={subscription.quota_7_day.used_value_usd}
        maxUsd={subscription.quota_7_day.max_value_usd}
      />

      <QuotaDisplay
        label="Monthly Quota"
        used={0}
        max={subscription.quota_monthly.max_flows}
        usedUsd={0}
        maxUsd={subscription.quota_monthly.max_value_usd}
      />

      <div
        className="flex items-center gap-1.5 p-2 rounded-md mt-2"
        style={{ backgroundColor: `${statusColor}20` }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        <span className="text-[11px]" style={{ color: statusColor }}>
          Account: {subscription.account_status}
        </span>
        <span className="text-[10px] text-[#666]">
          {subscription.plan.tier.toUpperCase()} Plan
        </span>
      </div>

      <div className="flex justify-between p-2 bg-[#3d3d3d] rounded-md mt-2">
        <span className="text-[10px] text-[#888]">Flow Rate</span>
        <span className="text-[10px] text-white">
          ${subscription.base_usd_per_flow} / Flow
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/tray-popup/
git commit -m "feat(ui): add tray popup components"
```

---

## Task 3: Modify Tray to Show Popup Window

**Files:**
- Modify: `src-tauri/src/tray.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Modify tray.rs to show window instead of menu**

Find the tray icon click handler and change to show window:

```rust
// In src-tauri/src/tray.rs, modify the TrayIconEvent handler
// Replace the menu-based approach with window show

use tauri::WebviewWindowBuilder;

// Add function to create/show tray popup window
pub fn show_tray_popup(app: &tauri::AppHandle) -> Result<(), AppError> {
    // Check if window already exists
    if let Some(window) = app.get_webview_window("tray_popup") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
        return Ok(());
    }

    // Create new popup window
    let window = WebviewWindowBuilder::new(
        app,
        "tray_popup",
        tauri::WebviewUrl::App("tray-popup".into()),
    )
    .title("CC Switch")
    .inner_size(320.0, 480.0)
    .resizable(false)
    .decorations(false)
    .always_on_top(true)
    .visible(false)
    .skip_taskbar(true)
    .build()
    .map_err(|e| AppError::Message(format!("Create popup window: {}", e)))?;

    let _ = window.show();
    Ok(())
}
```

- [ ] **Step 2: Update lib.rs to use new window approach**

In `lib.rs`, modify the tray setup:

```rust
// Replace .menu(&menu) with event handler to show window
let mut tray_builder = TrayIconBuilder::with_id("main")
    .on_tray_icon_event(|tray, event| match event {
        TrayIconEvent::Click { .. } => {
            if let Some(app) = tray.app_handle().get_webview_window("tray_popup") {
                if app.is_visible().unwrap_or(false) {
                    let _ = app.hide();
                } else {
                    let _ = app.show();
                    let _ = app.set_focus();
                }
            }
            // The popup will be created on first click
        }
        _ => {}
    })
    // Remove .menu() and .on_menu_event()
    .show_menu_on_left_click(true);
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/tray.rs src-tauri/src/lib.rs
git commit -m "feat(tray): show popup window on tray click"
```

---

## Task 4: Wire Up API Data

**Files:**
- Modify: `src/components/tray-popup/UsageDisplay.tsx`
- Create: `src/lib/api/zenmux.ts`

- [ ] **Step 1: Create ZenMux API client**

```typescript
// src/lib/api/zenmux.ts
import { invoke } from "@tauri-apps/api/core";

export interface ZenmuxSubscription {
  plan: {
    tier: string;
    amount_usd: number;
    interval: string;
    expires_at: string;
  };
  currency: string;
  base_usd_per_flow: number;
  effective_usd_per_flow: number;
  account_status: string;
  quota_5_hour: {
    usage_percentage: number;
    resets_at: string | null;
    max_flows: number;
    used_flows: number;
    remaining_flows: number;
    used_value_usd: number;
    max_value_usd: number;
  };
  quota_7_day: {
    usage_percentage: number;
    resets_at: string | null;
    max_flows: number;
    used_flows: number;
    remaining_flows: number;
    used_value_usd: number;
    max_value_usd: number;
  };
  quota_monthly: {
    max_flows: number;
    max_value_usd: number;
  };
}

export const zenmuxApi = {
  getSubscription: async (apiKey: string): Promise<ZenmuxSubscription> => {
    return invoke("fetch_zenmux_subscription", { apiKey });
  },
};
```

- [ ] **Step 2: Update UsageDisplay to use real API**

```tsx
// Update the UsageDisplay component
import { zenmuxApi } from "@/lib/api/zenmux";

export function UsageDisplay() {
  const { data, isLoading } = useQuery({
    queryKey: ["zenmux-subscription"],
    queryFn: () => zenmuxApi.getSubscription(apiKey),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return <div className="p-3 text-[#666]">Loading...</div>;
  }

  // Use data from API...
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/zenmux.ts src/components/tray-popup/
git commit -m "feat(api): wire up ZenMux subscription API"
```

---

## Task 5: Add Tray Popup Route

**Files:**
- Modify: `src/App.tsx` or router config

- [ ] **Step 1: Add tray-popup route**

Add the tray-popup as a new route in the app for the popup window to render.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(router): add tray-popup route"
```

---

## Task 6: Integration and Testing

**Files:**
- Testing across all components

- [ ] **Step 1: Test tray click shows popup**

Run the app and click the tray icon. Verify popup appears.

- [ ] **Step 2: Test navigation tabs**

Click between Claude/Codex/Gemini. Verify provider list updates.

- [ ] **Step 3: Test provider switch**

Click a different provider. Verify it becomes selected.

- [ ] **Step 4: Test usage display**

Verify progress bars show correct colors based on usage percentage.

- [ ] **Step 5: Test Open Main Window**

Click button, verify main window opens.

- [ ] **Step 6: Test Quit**

Click quit, verify app exits.

- [ ] **Step 7: Commit**

```bash
git commit -m "test: verify tray popup integration"
```

---

## Acceptance Criteria Check

- [ ] Click tray icon shows popup window
- [ ] Can switch between Claude/Codex/Gemini tabs
- [ ] Can switch provider in the list
- [ ] Each provider shows 5-hour usage percentage
- [ ] Usage display shows 5-Hour, 7-Day, Monthly data
- [ ] Progress bars use correct colors based on usage
- [ ] Account status and plan info displayed
- [ ] Open Main Window button works
- [ ] Quit button works
- [ ] Window appears near tray icon position

---

## Plan Complete

Implementation plan saved to `docs/superpowers/plans/2026-04-01-tray-popup-usage-plan.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**