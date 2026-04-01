import React from "react";
import { useQuery } from "@tanstack/react-query";
import { zenmuxApi, vscodeApi } from "@/lib/api";
import type { AppId } from "@/lib/api";

interface UsageDisplayProps {
  appId: AppId;
}

const getUsagePercentage = (used: number, total: number): number => {
  if (total === 0) return 0;
  return Math.min((used / total) * 100, 100);
};

const getUsageColor = (percentage: number): string => {
  if (percentage < 30) return "bg-green-400";
  if (percentage < 70) return "bg-yellow-400";
  return "bg-red-400";
};

const formatFlows = (flows: number): string => {
  if (flows >= 1000) {
    return `${(flows / 1000).toFixed(1)}k`;
  }
  return flows.toFixed(0);
};

export function UsageDisplay({ appId }: UsageDisplayProps) {
  // Fetch live provider settings to get the API key
  const { data: liveSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["liveProviderSettings", appId],
    queryFn: () => vscodeApi.getLiveProviderSettings(appId),
    staleTime: 30000, // 30 seconds
  });

  // Extract API key from live settings
  const apiKey = React.useMemo(() => {
    if (!liveSettings) return null;
    const config = liveSettings as Record<string, unknown>;
    // Check for apiKey at the top level
    if (typeof config.apiKey === "string" && config.apiKey) {
      return config.apiKey;
    }
    // Check in settingsConfig if available
    if (config.settingsConfig && typeof config.settingsConfig === "object") {
      const settingsConfig = config.settingsConfig as Record<string, unknown>;
      if (typeof settingsConfig.apiKey === "string" && settingsConfig.apiKey) {
        return settingsConfig.apiKey;
      }
      // Check for ANTHROPIC_AUTH_TOKEN or other common fields
      if (
        typeof settingsConfig.ANTHROPIC_AUTH_TOKEN === "string" &&
        settingsConfig.ANTHROPIC_AUTH_TOKEN
      ) {
        return settingsConfig.ANTHROPIC_AUTH_TOKEN;
      }
    }
    return null;
  }, [liveSettings]);

  // Fetch ZenMux subscription data if API key is available
  const {
    data: subscription,
    isLoading: isLoadingSubscription,
    error,
  } = useQuery({
    queryKey: ["zenmuxSubscription", apiKey],
    queryFn: () => zenmuxApi.getSubscription(apiKey!),
    enabled: !!apiKey,
    staleTime: 60000, // 1 minute
    retry: 1,
  });

  const isLoading = isLoadingSettings || (apiKey && isLoadingSubscription);

  // If no API key, show placeholder
  if (!isLoading && !apiKey) {
    return (
      <div className="px-2 py-2 border-t border-[#3d3d3d]">
        <div className="text-[11px] text-[#666] mb-2">Usage</div>
        <div className="text-[10px] text-[#666] text-center py-4">
          No ZenMux API key configured
        </div>
        <div className="text-[9px] text-[#555] text-center">
          Add API key in provider settings
        </div>
      </div>
    );
  }

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="px-2 py-2 border-t border-[#3d3d3d]">
        <div className="text-[11px] text-[#666] mb-2">Usage</div>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin h-4 w-4 border-2 border-[#666] border-t-transparent rounded-full" />
          <span className="text-[10px] text-[#666] ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  // If error, show error state
  if (error) {
    return (
      <div className="px-2 py-2 border-t border-[#3d3d3d]">
        <div className="text-[11px] text-[#666] mb-2">Usage</div>
        <div className="text-[10px] text-red-400 text-center py-2">
          Failed to load usage data
        </div>
        <div className="text-[9px] text-[#555] text-center">
          Check API key or try again
        </div>
      </div>
    );
  }

  // If no subscription data, show placeholder
  if (!subscription) {
    return (
      <div className="px-2 py-2 border-t border-[#3d3d3d]">
        <div className="text-[11px] text-[#666] mb-2">Usage</div>
        <div className="text-[10px] text-[#666] text-center py-4">
          No subscription data available
        </div>
      </div>
    );
  }

  // Parse real data from API response
  const h5Used = subscription.quota_5_hour.used_flows;
  const h5Total = subscription.quota_5_hour.max_flows;
  const d7Used = subscription.quota_7_day.used_flows;
  const d7Total = subscription.quota_7_day.max_flows;
  const monthlyUsed = subscription.quota_monthly.max_flows - subscription.quota_7_day.remaining_flows;
  const monthlyTotal = subscription.quota_monthly.max_flows;

  const h5Percent = getUsagePercentage(h5Used, h5Total);
  const d7Percent = getUsagePercentage(d7Used, d7Total);
  const monthlyPercent = getUsagePercentage(monthlyUsed, monthlyTotal);

  const accountStatus = subscription.account_status;
  const planName = subscription.plan.tier;

  return (
    <div className="px-2 py-2 border-t border-[#3d3d3d]">
      <div className="text-[11px] text-[#666] mb-2">Usage</div>

      {/* 5-Hour Window */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-[#888] mb-1">
          <span>5-Hour Window</span>
          <span>
            {formatFlows(h5Used)} / {formatFlows(h5Total)} flows
          </span>
        </div>
        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getUsageColor(h5Percent)}`}
            style={{ width: `${h5Percent}%` }}
          />
        </div>
      </div>

      {/* 7-Day Window */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-[#888] mb-1">
          <span>7-Day Window</span>
          <span>
            {formatFlows(d7Used)} / {formatFlows(d7Total)} flows
          </span>
        </div>
        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getUsageColor(d7Percent)}`}
            style={{ width: `${d7Percent}%` }}
          />
        </div>
      </div>

      {/* Monthly Quota */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-[#888] mb-1">
          <span>Monthly Quota</span>
          <span>
            {formatFlows(monthlyUsed)} / {formatFlows(monthlyTotal)} flows
          </span>
        </div>
        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getUsageColor(monthlyPercent)}`}
            style={{ width: `${monthlyPercent}%` }}
          />
        </div>
      </div>

      {/* Account Status */}
      <div className="flex justify-between text-[10px] mt-2 pt-2 border-t border-[#3d3d3d]">
        <span className="text-[#666]">Account</span>
        <span className="text-green-400">{accountStatus}</span>
      </div>
      <div className="flex justify-between text-[10px] mt-1">
        <span className="text-[#666]">Plan</span>
        <span className="text-[#888]">{planName}</span>
      </div>
    </div>
  );
}