import { useEffect, useState, useMemo } from "react";
import { AppNavBar } from "./AppNavBar";
import { ProviderList } from "./ProviderList";
import { UsageDisplay } from "./UsageDisplay";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import type { AppId } from "@/lib/api";
import { useProvidersQuery } from "@/lib/query/queries";
import { zenmuxApi } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type AppType = "claude" | "codex" | "gemini";

export function TrayPopup() {
  const [activeApp, setActiveApp] = useState<AppType>("claude");

  // Fetch providers to get API key for usage data
  const { data: providersData } = useProvidersQuery(activeApp as AppId);

  // Extract API key from the first provider that has usage_script with apiKey
  const apiKey = useMemo(() => {
    if (!providersData?.providers) return null;
    for (const provider of Object.values(providersData.providers)) {
      if (
        provider.meta?.usage_script?.enabled &&
        provider.meta?.usage_script?.apiKey
      ) {
        return provider.meta.usage_script.apiKey;
      }
    }
    return null;
  }, [providersData]);

  // Fetch ZenMux subscription data if API key is available
  const { data: subscription } = useQuery({
    queryKey: ["zenmuxSubscription", apiKey],
    queryFn: () => zenmuxApi.getSubscription(apiKey!),
    enabled: !!apiKey,
    staleTime: 60000,
    retry: 1,
  });

  const queryClient = useQueryClient();

  const handleProviderSwitched = () => {
    queryClient.invalidateQueries({ queryKey: ["zenmuxSubscription"] });
  };

  useEffect(() => {
    const root = document.getElementById("root");

    const logSnapshot = (label: string) => {
      const html = document.documentElement;
      const body = document.body;
      const rootEl = document.getElementById("root");
      const computedBody = window.getComputedStyle(body);
      const computedRoot = rootEl ? window.getComputedStyle(rootEl) : null;

      console.info("[TrayPopup]", label, {
        htmlClass: html.className,
        htmlBg: html.style.backgroundColor,
        htmlScheme: html.style.colorScheme,
        bodyClass: body.className,
        bodyBg: body.style.backgroundColor,
        bodyScheme: body.style.colorScheme,
        rootBg: rootEl?.style.backgroundColor ?? null,
        rootHeight: rootEl?.style.height ?? null,
        computedBodyBg: computedBody.backgroundColor,
        computedRootBg: computedRoot?.backgroundColor ?? null,
      });
    };

    logSnapshot("mounted");
    void invoke("log_tray_popup_debug", {
      label: "component-mounted",
      snapshot: {
        activeApp,
        rootExists: Boolean(root),
      },
    });

    const raf1 = window.requestAnimationFrame(() => logSnapshot("raf1"));
    const timer1 = window.setTimeout(() => logSnapshot("t250"), 250);
    const timer2 = window.setTimeout(() => logSnapshot("t1000"), 1000);

    const observer = new MutationObserver((mutations) => {
      console.info(
        "[TrayPopup] mutation",
        mutations.map((mutation) => ({
          target: (mutation.target as Element).tagName,
          attributeName: mutation.attributeName,
          className: (mutation.target as Element).className,
          style: (mutation.target as HTMLElement).getAttribute("style"),
        })),
      );
      logSnapshot("after-mutation");
      void invoke("log_tray_popup_debug", {
        label: "mutation",
        snapshot: mutations.map((mutation) => ({
          target: (mutation.target as Element).tagName,
          attributeName: mutation.attributeName,
          className: (mutation.target as Element).className,
          style: (mutation.target as HTMLElement).getAttribute("style"),
        })),
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    if (root) {
      observer.observe(root, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    }

    const onError = (event: ErrorEvent) => {
      console.error("[TrayPopup] window error", event.message, event.error);
      void invoke("log_tray_popup_debug", {
        label: "window-error",
        snapshot: {
          message: event.message,
          error: String(event.error ?? ""),
        },
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      console.error("[TrayPopup] unhandledrejection", event.reason);
      void invoke("log_tray_popup_debug", {
        label: "unhandledrejection",
        snapshot: {
          reason: String(event.reason ?? ""),
        },
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.cancelAnimationFrame(raf1);
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      observer.disconnect();
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    void invoke("log_tray_popup_debug", {
      label: "activeApp-change",
      snapshot: {
        activeApp,
      },
    });
  }, [activeApp]);

  const handleOpenMainWindow = async () => {
    try {
      await invoke("show_main_window");
      // Hide the popup
      const popup = await WebviewWindow.getByLabel("tray_popup");
      if (popup) {
        await popup.hide();
      }
    } catch (e) {
      console.error("Failed to show main window:", e);
    }
  };

  const handleQuit = async () => {
    await invoke("quit_app");
  };

  return (
    <div className="flex h-[520px] w-[320px] flex-col overflow-hidden bg-[#2d2d2d] text-white shadow-2xl border border-white/10">
      <AppNavBar active={activeApp} onChange={setActiveApp} />
      <div className="flex-1 overflow-y-auto">
        <ProviderList
          appType={activeApp as AppId}
          usagePercentage={subscription?.quota_5_hour?.usage_percentage}
          onProviderSwitched={handleProviderSwitched}
        />
        <UsageDisplay appId={activeApp as AppId} />
      </div>
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
