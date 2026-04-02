import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { zenmuxApi } from "@/lib/api";
import { useProvidersQuery } from "@/lib/query";
import type { AppId } from "@/lib/api";

interface UsageDisplayProps {
  appId: AppId;
}

const getUsageColor = (percentage: number): string => {
  if (percentage < 30) return "bg-green-400";
  if (percentage < 70) return "bg-yellow-400";
  return "bg-red-400";
};

const getUsageHexColor = (percentage: number): string => {
  if (percentage < 30) return "#4ade80";
  if (percentage < 70) return "#facc15";
  return "#f87171";
};

const formatFlows = (flows: number | undefined | null): string => {
  if (!Number.isFinite(flows)) {
    return "0";
  }
  if ((flows as number) >= 1000) {
    return `${((flows as number) / 1000).toFixed(1)}k`;
  }
  return (flows as number).toFixed(0);
};

const formatResetTime = (resetsAt: string | null | undefined): string => {
  if (!resetsAt) return "N/A";
  const resetDate = new Date(resetsAt);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  if (diffHours < 0) return "Expired";
  if (diffHours < 1) return "Less than 1h";
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ${diffHours % 24}h`;
};

const formatDateTime = (isoString: string | null | undefined): string => {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  return date.toLocaleString();
};

export function UsageDisplay({ appId }: UsageDisplayProps) {
  // Fetch providers to get API key from usage_script
  const { data: providersData } = useProvidersQuery(appId);

  // Extract API key from the first provider that has usage_script with apiKey
  const apiKey = React.useMemo(() => {
    if (!providersData?.providers) return null;
    // Find provider with usage_script enabled and apiKey
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

  // Fetch ZenMux PAYG balance data if API key is available
  const {
    data: paygBalance,
    isLoading: isLoadingPayg,
  } = useQuery({
    queryKey: ["zenmuxPaygBalance", apiKey],
    queryFn: () => zenmuxApi.getPaygBalance(apiKey!),
    enabled: !!apiKey,
    staleTime: 60000,
    retry: 1,
  });

  const isLoading = isLoadingSubscription;

  useEffect(() => {
    console.info("[TrayPopup][UsageDisplay]", {
      appId,
      apiKeyPresent: Boolean(apiKey),
      isLoading,
      hasSubscription: Boolean(subscription),
      hasError: Boolean(error),
    });
  }, [appId, apiKey, error, isLoading, subscription]);

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
        </div>
      </div>
    );
  }

  // If error, show error state
  if (error) {
    return (
      <div className="px-2 py-2 border-t border-[#3d3d3d]">
        <div className="text-[11px] text-[#666] mb-2">Usage</div>
        <div className="text-[10px] text-red-400 text-center py-4">
          Failed to load usage data
        </div>
      </div>
    );
  }

  // Mock data for display when no subscription data
  const mockData = !subscription;

  // Mock subscription for demo
  const sub = subscription || {
    plan: { tier: "ultra", amount_usd: 200, interval: "month", expires_at: "2026-04-12T08:26:56.000Z" },
    currency: "usd",
    base_usd_per_flow: 0.03283,
    effective_usd_per_flow: 0.03283,
    account_status: mockData ? "healthy" : "unknown",
    quota_5_hour: { usage_percentage: 0.0715, max_flows: 800, used_flows: 57.2, remaining_flows: 742.8, used_value_usd: 1.88, max_value_usd: 26.27, resets_at: "2026-04-02T12:00:00.000Z" },
    quota_7_day: { usage_percentage: 0.0673, max_flows: 6182, used_flows: 416, remaining_flows: 5766, used_value_usd: 13.66, max_value_usd: 202.99, resets_at: "2026-04-09T00:00:00.000Z" },
    quota_monthly: { max_flows: 34560, max_value_usd: 1134.33 },
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "healthy":
        return "#10b981";
      case "monitored":
        return "#f59e0b";
      default:
        return "#ef4444";
    }
  };

  const statusColor = getStatusColor(sub.account_status);

  return (
    <div className="px-3 py-2 border-t border-[#3d3d3d]">
      <div className="text-[10px] text-[#666] uppercase mb-2">Usage (ZenMux)</div>

      {/* 5-Hour Window */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-[#aaa]">5-Hour Window</span>
          <span className="text-[11px] text-white">
            {formatFlows(sub.quota_5_hour.used_flows)} / {formatFlows(sub.quota_5_hour.max_flows)} Flows
          </span>
        </div>
        <div className="h-1.5 bg-[#3d3d3d] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getUsageColor(sub.quota_5_hour.usage_percentage * 100)}`}
            style={{ width: `${sub.quota_5_hour.usage_percentage * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-[#666]">
            ${sub.quota_5_hour.used_value_usd.toFixed(2)} / ${sub.quota_5_hour.max_value_usd.toFixed(2)}
          </span>
          <span
            className="text-[9px]"
            style={{ color: getUsageHexColor(sub.quota_5_hour.usage_percentage * 100) }}
          >
            {(sub.quota_5_hour.usage_percentage * 100).toFixed(2)}% used
          </span>
        </div>
        {/* NEW: Reset time */}
        <div className="flex justify-end mt-0.5">
          <span className="text-[9px] text-[#666]">
            Resets in {formatResetTime(sub.quota_5_hour.resets_at)}
          </span>
        </div>
      </div>

      {/* 7-Day Window */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-[#aaa]">7-Day Window</span>
          <span className="text-[11px] text-white">
            {formatFlows(sub.quota_7_day.used_flows)} / {formatFlows(sub.quota_7_day.max_flows)} Flows
          </span>
        </div>
        <div className="h-1.5 bg-[#3d3d3d] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getUsageColor(sub.quota_7_day.usage_percentage * 100)}`}
            style={{ width: `${sub.quota_7_day.usage_percentage * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-[#666]">
            ${sub.quota_7_day.used_value_usd.toFixed(2)} / ${sub.quota_7_day.max_value_usd.toFixed(2)}
          </span>
          <span
            className="text-[9px]"
            style={{ color: getUsageHexColor(sub.quota_7_day.usage_percentage * 100) }}
          >
            {(sub.quota_7_day.usage_percentage * 100).toFixed(2)}% used
          </span>
        </div>
        {/* NEW: Reset time */}
        <div className="flex justify-end mt-0.5">
          <span className="text-[9px] text-[#666]">
            Resets {formatDateTime(sub.quota_7_day.resets_at)}
          </span>
        </div>
      </div>

      {/* PAYG Balance */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-[#aaa]">PAYG Balance</span>
          <span className="text-[11px] text-white">
            ${paygBalance?.total_credits.toFixed(2) ?? "--"}
          </span>
        </div>
        <div className="h-1.5 bg-[#3d3d3d] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#4a9eff]"
            style={{ width: "100%" }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-[#666]">
            Top-up: ${paygBalance?.top_up_credits.toFixed(2) ?? "--"}
          </span>
          <span className="text-[9px] text-[#666]">
            Bonus: ${paygBalance?.bonus_credits.toFixed(2) ?? "--"}
          </span>
        </div>
      </div>

      {/* Account Status */}
      <div
        className="flex items-center gap-1.5 p-2 rounded-md mt-2"
        style={{ backgroundColor: `${statusColor}20` }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        <span className="text-[11px]" style={{ color: statusColor }}>
          Account: {sub.account_status}
        </span>
        <span className="text-[10px] text-[#666]">
          {sub.plan.tier.toUpperCase()} Plan
        </span>
      </div>

      {/* Flow Rate */}
      <div className="flex justify-between p-2 bg-[#3d3d3d] rounded-md mt-2">
        <span className="text-[10px] text-[#888]">Flow Rate</span>
        <span className="text-[10px] text-white">
          ${sub.base_usd_per_flow} / Flow
        </span>
      </div>
    </div>
  );
}
