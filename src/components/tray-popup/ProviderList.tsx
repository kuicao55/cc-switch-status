import { useEffect } from "react";
import type { AppId } from "@/lib/api";
import { useProvidersQuery } from "@/lib/query/queries";
import { providersApi } from "@/lib/api/providers";
import { useQuery } from "@tanstack/react-query";

// Mock usage percentage - will be replaced with real data
const getMockUsagePercentage = (): number => {
  return Math.floor(Math.random() * 100);
};

const getUsageColor = (percentage: number): string => {
  if (percentage < 30) return "text-green-400";
  if (percentage < 70) return "text-yellow-400";
  return "text-red-400";
};

interface ProviderListProps {
  appType: AppId;
}

export function ProviderList({ appType }: ProviderListProps) {
  const { data: providersData, isLoading } = useProvidersQuery(appType);

  // Get current provider
  const { data: currentProviderId } = useQuery({
    queryKey: ["currentProvider", appType],
    queryFn: () => providersApi.getCurrent(appType),
  });

  useEffect(() => {
    console.info("[TrayPopup][ProviderList]", {
      appType,
      isLoading,
      providerCount: providersData?.providers
        ? Object.keys(providersData.providers).length
        : 0,
      currentProviderId,
    });
  }, [appType, currentProviderId, isLoading, providersData]);

  if (isLoading) {
    return (
      <div className="p-2">
        <div className="text-[11px] text-[#666]">Loading providers...</div>
      </div>
    );
  }

  const providers = providersData?.providers
    ? Object.values(providersData.providers).slice(0, 5)
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
          const usagePercentage = getMockUsagePercentage();
          const isCurrent = provider.id === currentProviderId;

          return (
            <div
              key={provider.id}
              className={`flex items-center justify-between py-1 px-2 rounded ${
                isCurrent ? "bg-[#3d3d3d]" : ""
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
              <span
                className={`text-[11px] ${getUsageColor(usagePercentage)}`}
              >
                {usagePercentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
