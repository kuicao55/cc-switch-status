import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { TrayPopup } from "./components/tray-popup/TrayPopup";
import "./index.css";
// 导入国际化配置
import i18n from "./i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { queryClient } from "@/lib/query";
import { Toaster } from "@/components/ui/sonner";
import { UpdateProvider } from "./contexts/UpdateContext";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { message } from "@tauri-apps/plugin-dialog";
import { exit } from "@tauri-apps/plugin-process";

// 根据平台添加 body class，便于平台特定样式
try {
  const ua = navigator.userAgent || "";
  const plat = (navigator.platform || "").toLowerCase();
  const isMac = /mac/i.test(ua) || plat.includes("mac");
  if (isMac) {
    document.body.classList.add("is-mac");
  }
} catch {
  // 忽略平台检测失败
}

// 配置加载错误payload类型
interface ConfigLoadErrorPayload {
  path?: string;
  error?: string;
}

/**
 * 处理配置加载失败：显示错误消息并强制退出应用
 * 不给用户"取消"选项，因为配置损坏时应用无法正常运行
 */
async function handleConfigLoadError(
  payload: ConfigLoadErrorPayload | null,
): Promise<void> {
  const path = payload?.path ?? "~/.cc-switch/config.json";
  const detail = payload?.error ?? "Unknown error";

  await message(
    i18n.t("errors.configLoadFailedMessage", {
      path,
      detail,
      defaultValue:
        "无法读取配置文件：\n{{path}}\n\n错误详情：\n{{detail}}\n\n请手动检查 JSON 是否有效，或从同目录的备份文件（如 config.json.bak）恢复。\n\n应用将退出以便您进行修复。",
    }),
    {
      title: i18n.t("errors.configLoadFailedTitle", {
        defaultValue: "配置加载失败",
      }),
      kind: "error",
    },
  );

  await exit(1);
}

// 监听后端的配置加载错误事件：仅提醒用户并强制退出，不修改任何配置文件
try {
  void listen("configLoadError", async (evt) => {
    await handleConfigLoadError(evt.payload as ConfigLoadErrorPayload | null);
  });
} catch (e) {
  // 忽略事件订阅异常（例如在非 Tauri 环境下）
  console.error("订阅 configLoadError 事件失败", e);
}

// Detect if running as tray popup window
function isTrayPopupRoute(): boolean {
  // Check for tray_popup=1 query parameter
  // This is set by the Rust backend when creating the tray popup window
  const params = new URLSearchParams(window.location.search);
  if (params.get("tray_popup") === "1") {
    return true;
  }
  // Fallback: check for hash-based routing
  const hash = window.location.hash;
  return hash === "#tray-popup";
}

async function bootstrap() {
  // 启动早期主动查询后端初始化错误，避免事件竞态
  try {
    const initError = (await invoke(
      "get_init_error",
    )) as ConfigLoadErrorPayload | null;
    if (initError && (initError.path || initError.error)) {
      await handleConfigLoadError(initError);
      // 注意：不会执行到这里，因为 exit(1) 会终止进程
      return;
    }
  } catch (e) {
    // 忽略拉取错误，继续渲染
    console.error("拉取初始化错误失败", e);
  }

  const isTrayPopup = isTrayPopupRoute();

  const reportTrayPopupDebug = async (label: string, snapshot: Record<string, unknown>) => {
    if (!isTrayPopup) {
      return;
    }

    try {
      await invoke("log_tray_popup_debug", {
        label,
        snapshot,
      });
    } catch (error) {
      console.error("[TrayPopup] failed to report debug snapshot", label, error);
    }
  };

  if (isTrayPopup) {
    console.info("[TrayPopup] bootstrap", {
      href: window.location.href,
      search: window.location.search,
      hash: window.location.hash,
      readyState: document.readyState,
    });
    void reportTrayPopupDebug("bootstrap", {
      href: window.location.href,
      search: window.location.search,
      hash: window.location.hash,
      readyState: document.readyState,
    });
  }

  if (isTrayPopup) {
    void reportTrayPopupDebug("before-inline-style", {
      htmlBg: document.documentElement.style.backgroundColor,
      htmlScheme: document.documentElement.style.colorScheme,
      bodyBg: document.body.style.backgroundColor,
      bodyScheme: document.body.style.colorScheme,
      bodyColor: document.body.style.color,
      rootExists: Boolean(document.getElementById("root")),
    });
    document.documentElement.style.backgroundColor = "#2d2d2d";
    document.documentElement.style.colorScheme = "dark";
    document.documentElement.style.height = "100%";
    document.body.style.backgroundColor = "#2d2d2d";
    document.body.style.colorScheme = "dark";
    document.body.style.color = "#ffffff";
    document.body.style.margin = "0";
    document.body.style.height = "100%";
    const root = document.getElementById("root");
    if (root) {
      root.style.backgroundColor = "#2d2d2d";
      root.style.height = "100%";
    }
    void reportTrayPopupDebug("after-inline-style", {
      htmlBg: document.documentElement.style.backgroundColor,
      htmlScheme: document.documentElement.style.colorScheme,
      bodyBg: document.body.style.backgroundColor,
      bodyScheme: document.body.style.colorScheme,
      bodyColor: document.body.style.color,
      rootBg: root?.style.backgroundColor ?? null,
      rootHeight: root?.style.height ?? null,
    });
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        {isTrayPopup ? (
          <TrayPopup />
        ) : (
          <ThemeProvider defaultTheme="system" storageKey="cc-switch-theme">
            <UpdateProvider>
              <App />
              <Toaster />
            </UpdateProvider>
          </ThemeProvider>
        )}
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

void bootstrap();
