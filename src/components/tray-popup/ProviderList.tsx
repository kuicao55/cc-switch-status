import React from "react";
import type { Provider } from "@/types";
import type { AppId } from "@/lib/api/types";
import { useProviderSubscription } from "./useProviderSubscription";
import { RefreshCw } from "lucide-react";

interface ProviderListProps {
  providers: Provider[];
  currentProviderId: string;
  switchingProviderId: string | null;
  isLoading: boolean;
  isRefreshing?: boolean;
  onProviderSwitch: (providerId: string) => Promise<void>;
  appId: AppId;
}

const formatRelativeTime = (timestamp: number, now: number): string => {
  const diff = Math.floor((now - timestamp) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const getUsageColor = (percentage: number): string => {
  if (percentage < 30) return "text-green-400";
  if (percentage < 70) return "text-yellow-400";
  return "text-red-400";
};

interface ProviderUsageBadgeProps {
  provider: Provider;
  appId: AppId;
}

function ProviderUsageBadge({ provider, appId }: ProviderUsageBadgeProps) {
  const { isFetching, usagePercentage, apiKey } = useProviderSubscription(provider, appId);

  if (!apiKey) {
    return <span className="text-[11px] text-[#666]">--</span>;
  }

  if (isFetching && usagePercentage === null) {
    return <span className="text-[11px] text-[#666]">...</span>;
  }

  if (usagePercentage === null) {
    return <span className="text-[11px] text-[#666]">--</span>;
  }

  return (
    <span className={`text-[11px] ${getUsageColor(usagePercentage)}`}>
      {usagePercentage.toFixed(1)}%
    </span>
  );
}

interface ProviderRowProps {
  provider: Provider;
  isCurrent: boolean;
  isSwitching: boolean;
  onProviderSwitch: (providerId: string) => Promise<void>;
  appId: AppId;
}

function ProviderRow({
  provider,
  isCurrent,
  isSwitching,
  onProviderSwitch,
  appId,
}: ProviderRowProps) {
  const handleClick = async () => {
    if (isCurrent || isSwitching) {
      return;
    }

    console.info("[TrayPopup][ProviderClick]", {
      providerId: provider.id,
      providerName: provider.name,
    });
    await onProviderSwitch(provider.id);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSwitching}
      className={`flex w-full items-center justify-between py-1 px-2 rounded text-left transition-colors ${
        isCurrent ? "bg-[#3d3d3d]" : "hover:bg-[#333]"
      } ${isSwitching ? "opacity-70" : ""}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            isCurrent ? "bg-[#4a9eff]" : "bg-[#666]"
          }`}
        />
        <span className="text-[12px] text-white truncate max-w-[150px]">
          {provider.name}
        </span>
        {isCurrent && <span className="text-[10px] text-[#4a9eff]">Active</span>}
        {isSwitching && (
          <span className="text-[10px] text-[#888]">Switching...</span>
        )}
      </div>
      <ProviderUsageBadge provider={provider} appId={appId} />
    </button>
  );
}

export function ProviderList({
  providers,
  currentProviderId,
  switchingProviderId,
  isLoading,
  isRefreshing,
  onProviderSwitch,
  appId,
}: ProviderListProps) {
  // 获取第一个有 API key 的 provider 来显示刷新时间
  const firstProviderWithKey = providers.find(p => p.meta?.usage_script?.apiKey);
  const { isFetching: isAnyFetching, lastQueriedAt } = useProviderSubscription(
    firstProviderWithKey || null,
    appId
  );
  const [now, setNow] = React.useState(Date.now());

  // 每 30 秒更新当前时间
  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const showRefreshing = isRefreshing || isAnyFetching;
  const showLastRefreshed = !showRefreshing && lastQueriedAt;

  if (isLoading) {
    return (
      <div className="p-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#666]">Loading providers...</span>
        </div>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="p-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#666]">No providers configured</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 py-1">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11px] text-[#666]">Providers</span>
        {showRefreshing ? (
          <RefreshCw size={10} className="animate-spin text-[#666]" />
        ) : showLastRefreshed ? (
          <span className="text-[9px] text-[#555]">{formatRelativeTime(lastQueriedAt, now)}</span>
        ) : null}
      </div>
      <div className="space-y-1">
        {providers.map((provider) => (
          <ProviderRow
            key={provider.id}
            provider={provider}
            isCurrent={provider.id === currentProviderId}
            isSwitching={switchingProviderId === provider.id}
            onProviderSwitch={onProviderSwitch}
            appId={appId}
          />
        ))}
      </div>
    </div>
  );
}
