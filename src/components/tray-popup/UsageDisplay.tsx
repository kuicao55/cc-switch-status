import { useQuery } from "@tanstack/react-query";
import type { Provider } from "@/types";
import { zenmuxApi } from "@/lib/api";
import type { PaygBalance } from "@/lib/api/zenmux";
import { useZenmuxSubscription } from "./useZenmuxSubscription";

interface UsageDisplayProps {
  provider: Provider | null;
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

const formatCredits = (credits: number | undefined | null): string => {
  if (!Number.isFinite(credits)) {
    return "--";
  }
  return (credits as number).toFixed(2);
};

const formatResetTime = (resetsAt: string | null | undefined): string => {
  if (!resetsAt) return "N/A";

  const resetDate = new Date(resetsAt);
  if (Number.isNaN(resetDate.getTime())) return "N/A";

  const diffMs = resetDate.getTime() - Date.now();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (diffHours < 0) return "Expired";
  if (diffHours < 1) return "Less than 1h";
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ${diffHours % 24}h`;
};

const formatResetDate = (resetsAt: string | null | undefined): string => {
  if (!resetsAt) return "N/A";

  const resetDate = new Date(resetsAt);
  if (Number.isNaN(resetDate.getTime())) return "N/A";

  return resetDate.toLocaleString();
};

export function UsageDisplay({ provider }: UsageDisplayProps) {
  const { data: subscription, isLoading, isFetching, error, apiKey } =
    useZenmuxSubscription(provider);
  const { data: paygBalance, isLoading: isLoadingPayg } = useQuery<PaygBalance>(
    {
      queryKey: ["zenmuxPaygBalance", provider?.id ?? "", apiKey ?? ""],
      queryFn: () => zenmuxApi.getPaygBalance(apiKey!),
      enabled: Boolean(apiKey && provider?.id),
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  );

  if (!provider) {
    return (
      <div className="px-2 py-2 border-t border-[#3d3d3d]">
        <div className="text-[11px] text-[#666] mb-2">Usage</div>
        <div className="text-[10px] text-[#666] text-center py-4">
          No provider selected
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="px-2 py-2 border-t border-[#3d3d3d]">
        <div className="text-[11px] text-[#666] mb-2">Usage</div>
        <div className="text-[10px] text-[#666] text-center py-4">
          No ZenMux API key configured
        </div>
      </div>
    );
  }

  if (isLoading || (isFetching && !subscription)) {
    return (
      <div className="px-2 py-2 border-t border-[#3d3d3d]">
        <div className="text-[11px] text-[#666] mb-2">Usage</div>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin h-4 w-4 border-2 border-[#666] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="px-2 py-2 border-t border-[#3d3d3d]">
        <div className="text-[11px] text-[#666] mb-2">Usage</div>
        <div className="text-[10px] text-red-400 text-center py-4">
          Failed to load usage data
        </div>
      </div>
    );
  }

  const percent = subscription.quota_5_hour.usage_percentage * 100;
  const barColor = getUsageColor(percent);
  const statusColor =
    subscription.account_status === "healthy"
      ? "#10b981"
      : subscription.account_status === "monitored"
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div className="px-3 py-2 border-t border-[#3d3d3d]">
      <div className="text-[10px] text-[#666] uppercase mb-2">Usage (ZenMux)</div>

      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-[#aaa]">5-Hour Window</span>
          <span className="text-[11px] text-white">
            {formatFlows(subscription.quota_5_hour.used_flows)} /{" "}
            {formatFlows(subscription.quota_5_hour.max_flows)} Flows
          </span>
        </div>
        <div className="h-1.5 bg-[#3d3d3d] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-[#666]">
            ${subscription.quota_5_hour.used_value_usd.toFixed(2)} / $
            {subscription.quota_5_hour.max_value_usd.toFixed(2)}
          </span>
          <span
            className="text-[9px]"
            style={{ color: getUsageHexColor(percent) }}
          >
            {percent.toFixed(2)}% used
          </span>
        </div>
        <div className="flex justify-end mt-0.5">
          <span className="text-[9px] text-[#666]">
            Resets in {formatResetTime(subscription.quota_5_hour.resets_at)}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-[#aaa]">7-Day Window</span>
          <span className="text-[11px] text-white">
            {formatFlows(subscription.quota_7_day.used_flows)} /{" "}
            {formatFlows(subscription.quota_7_day.max_flows)} Flows
          </span>
        </div>
        <div className="h-1.5 bg-[#3d3d3d] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getUsageColor(
              subscription.quota_7_day.usage_percentage * 100,
            )}`}
            style={{
              width: `${subscription.quota_7_day.usage_percentage * 100}%`,
            }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-[#666]">
            ${subscription.quota_7_day.used_value_usd.toFixed(2)} / $
            {subscription.quota_7_day.max_value_usd.toFixed(2)}
          </span>
          <span
            className="text-[9px]"
            style={{
              color: getUsageHexColor(
                subscription.quota_7_day.usage_percentage * 100,
              ),
            }}
          >
            {(subscription.quota_7_day.usage_percentage * 100).toFixed(2)}% used
          </span>
        </div>
        <div className="flex justify-end mt-0.5">
          <span className="text-[9px] text-[#666]">
            Resets on {formatResetDate(subscription.quota_7_day.resets_at)}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-[#aaa]">PAYG Balance</span>
          <span className="text-[11px] text-white">
            {isLoadingPayg && !paygBalance
              ? "..."
              : `$${formatCredits(paygBalance?.total_credits)}`}
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
            Top-up: ${formatCredits(paygBalance?.top_up_credits)}
          </span>
          <span className="text-[9px] text-[#666]">
            Bonus: ${formatCredits(paygBalance?.bonus_credits)}
          </span>
        </div>
      </div>

      <div
        className="flex items-center gap-1.5 p-2 rounded-md mt-2"
        style={{ backgroundColor: `${statusColor}20` }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        <span className="text-[11px]" style={{ color: statusColor }}>
          Account: {subscription.account_status}
        </span>
        <span className="text-[10px] text-[#666]">
          {subscription.plan.tier.toUpperCase()} Plan
        </span>
      </div>

      <div className="flex justify-between p-2 bg-[#3d3d3d] rounded-md mt-2">
        <span className="text-[10px] text-[#888]">Flow Rate</span>
        <span className="text-[10px] text-white">
          ${subscription.base_usd_per_flow} / Flow
        </span>
      </div>
    </div>
  );
}
