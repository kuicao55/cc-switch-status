import type { AppId } from "@/lib/api";
import { useProvidersQuery } from "@/lib/query/queries";
import { providersApi } from "@/lib/api/providers";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const getUsageColor = (percentage: number): string => {
  if (percentage < 30) return "text-green-400";
  if (percentage < 70) return "text-yellow-400";
  return "text-red-400";
};

interface ProviderListProps {
  appType: AppId;
  usagePercentage?: number | null;
  onProviderSwitched?: () => void;
}

export function ProviderList({ appType, usagePercentage, onProviderSwitched }: ProviderListProps) {
  const queryClient = useQueryClient();
  const { data: providersData, isLoading } = useProvidersQuery(appType);

  const { data: currentProviderId } = useQuery({
    queryKey: ["currentProvider", appType],
    queryFn: () => providersApi.getCurrent(appType),
  });

  const handleProviderClick = async (providerId: string) => {
    if (providerId === currentProviderId) return;
    try {
      await providersApi.switch(providerId, appType);
      queryClient.invalidateQueries({ queryKey: ["providers", appType] });
      queryClient.invalidateQueries({ queryKey: ["currentProvider", appType] });
      onProviderSwitched?.();
    } catch (e) {
      console.error("[TrayPopup] Failed to switch provider:", e);
    }
  };

  if (isLoading) {
    return (
      <div className="p-2">
        <div className="text-[11px] text-[#666]">Loading providers...</div>
      </div>
    );
  }

  const providers = providersData?.providers
    ? Object.values(providersData.providers)
    : [];

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
        {providers.map((provider) => {
          const isCurrent = provider.id === currentProviderId;
          const displayPercentage = usagePercentage != null ? Math.round(usagePercentage * 100) : null;

          return (
            <div
              key={provider.id}
              onClick={() => handleProviderClick(provider.id)}
              className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-colors ${
                isCurrent ? "bg-[#3d3d3d]" : "hover:bg-[#2a2a2a]"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isCurrent ? "bg-[#4a9eff]" : "bg-[#666]"
                  }`}
                />
                <span className="text-[12px] text-white truncate max-w-[150px]">
                  {provider.name}
                </span>
                {isCurrent && (
                  <span className="text-[10px] text-[#4a9eff]">Active</span>
                )}
              </div>
              {displayPercentage !== null && (
                <span
                  className={`text-[11px] ${getUsageColor(displayPercentage)}`}
                >
                  {displayPercentage}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
