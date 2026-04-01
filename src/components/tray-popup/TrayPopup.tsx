import React, { useState } from "react";
import { AppNavBar } from "./AppNavBar";
import { ProviderList } from "./ProviderList";
import { UsageDisplay } from "./UsageDisplay";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import type { AppId } from "@/lib/api";

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
      <ProviderList appType={activeApp as AppId} />
      <UsageDisplay appId={activeApp as AppId} />
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