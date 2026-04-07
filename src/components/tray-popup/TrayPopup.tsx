import { useEffect, useMemo, useState } from "react";
import { AppNavBar } from "./AppNavBar";
import { ProviderList } from "./ProviderList";
import { UsageDisplay } from "./UsageDisplay";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import { providersApi, type AppId } from "@/lib/api";
import { useProvidersQuery, type ProvidersQueryData } from "@/lib/query/queries";

type AppType = "claude" | "codex" | "gemini";

export function TrayPopup() {
  const [activeApp, setActiveApp] = useState<AppType>("claude");
  const [switchingProviderId, setSwitchingProviderId] = useState<string | null>(
    null,
  );
  const queryClient = useQueryClient();
  const { data: providersData, isLoading, isFetching: isProvidersFetching } = useProvidersQuery(activeApp as AppId);

  const providers = useMemo(
    () => Object.values(providersData?.providers ?? {}).slice(0, 5),
    [providersData?.providers],
  );
  const currentProviderId = providersData?.currentProviderId ?? "";
  const currentProvider = providersData?.providers?.[currentProviderId] ?? null;

  // 每次弹窗打开时刷新数据
  useEffect(() => {
    const refreshOnOpen = async () => {
      console.info("[TrayPopup] Refreshing data on popup open");
      // 使用 invalidateQueries 强制失效缓存，确保重新获取数据
      await queryClient.invalidateQueries({ queryKey: ["providers", activeApp] });
      await queryClient.invalidateQueries({ queryKey: ["providerSubscription"] });
    };

    refreshOnOpen();
  }, []);

  // 监听 Rust 后端发送的 tray-popup-shown 事件
  useEffect(() => {
    const unlistenPromise = listen("tray-popup-shown", async () => {
      console.info("[TrayPopup] Received tray-popup-shown event, refreshing data");
      await queryClient.invalidateQueries({ queryKey: ["providers", activeApp] });
      await queryClient.invalidateQueries({ queryKey: ["providerSubscription"] });
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [activeApp, queryClient]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const subscribe = async () => {
      try {
        unlisten = await providersApi.onSwitched(async (event) => {
          if (event.appType !== activeApp) {
            return;
          }

          console.info("[TrayPopup][ProviderSwitchEvent]", event);
          queryClient.setQueryData<ProvidersQueryData | undefined>(
            ["providers", activeApp],
            (old) => {
              if (!old) {
                return old;
              }

              return {
                ...old,
                currentProviderId: event.providerId,
              };
            },
          );

          await queryClient.refetchQueries({
            queryKey: ["providers", activeApp],
          });
          await queryClient.refetchQueries({
            queryKey: ["zenmuxSubscription"],
          });
        });
      } catch (error) {
        console.error("[TrayPopup] failed to subscribe provider switch event", error);
      }
    };

    void subscribe();

    return () => {
      unlisten?.();
    };
  }, [activeApp, queryClient]);

  const handleProviderSwitch = async (providerId: string) => {
    if (providerId === currentProviderId || switchingProviderId) {
      return;
    }

    console.info("[TrayPopup][ProviderSwitchRequest]", {
      app: activeApp,
      providerId,
    });
    setSwitchingProviderId(providerId);
    try {
      await providersApi.switch(providerId, activeApp);
      queryClient.setQueryData<ProvidersQueryData | undefined>(
        ["providers", activeApp],
        (old) => {
          if (!old) {
            return old;
          }

          return {
            ...old,
            currentProviderId: providerId,
          };
        },
      );
      await queryClient.refetchQueries({ queryKey: ["providers", activeApp] });
      await queryClient.refetchQueries({ queryKey: ["zenmuxSubscription"] });
    } catch (error) {
      console.error("[TrayPopup] failed to switch provider", error);
    } finally {
      setSwitchingProviderId(null);
    }
  };

  const handleOpenMainWindow = async () => {
    try {
      console.info("[TrayPopup] open_main_window_clicked");
      await invoke("show_main_window");
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
          providers={providers}
          currentProviderId={currentProviderId}
          switchingProviderId={switchingProviderId}
          isLoading={isLoading}
          isRefreshing={isProvidersFetching}
          onProviderSwitch={handleProviderSwitch}
          appId={activeApp as AppId}
        />
        <UsageDisplay provider={currentProvider} appId={activeApp as AppId} />
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
