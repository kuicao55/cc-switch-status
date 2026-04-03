import type { Provider } from "@/types";
import type { AppId } from "@/lib/api/types";
import { useProviderSubscription } from "./useProviderSubscription";

interface ProviderListProps {
  providers: Provider[];
  currentProviderId: string;
  switchingProviderId: string | null;
  isLoading: boolean;
  onProviderSwitch: (providerId: string) => Promise<void>;
  appId: AppId;
}

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
  onProviderSwitch,
  appId,
}: ProviderListProps) {
  if (isLoading) {
    return (
      <div className="p-2">
        <div className="text-[11px] text-[#666]">Loading providers...</div>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="p-2">
        <div className="text-[11px] text-[#666]">No providers configured</div>
      </div>
    );
  }

  return (
    <div className="px-2 py-1">
      <div className="text-[11px] text-[#666] mb-1">Providers</div>
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
