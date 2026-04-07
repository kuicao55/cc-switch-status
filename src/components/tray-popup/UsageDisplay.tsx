import React from "react";
import type { Provider } from "@/types";
import { useProviderSubscription } from "./useProviderSubscription";
import type { AppId } from "@/lib/api/types";
import type { WindowUsage, PaygInfo } from "@/types";
import { RefreshCw } from "lucide-react";

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

const formatRelativeTime = (timestamp: number, now: number): string => {
  const diff = Math.floor((now - timestamp) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
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

const formatResetTimeFromISO = (isoString: string | null | undefined): string => {
  if (!isoString) return "N/A";

  const resetDate = new Date(isoString);
  if (Number.isNaN(resetDate.getTime())) return "N/A";

  const diffMs = resetDate.getTime() - Date.now();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (diffHours < 0) return "Expired";
  if (diffHours < 1) return "Less than 1h";
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ${diffHours % 24}h`;
};

const formatResetDateFromISO = (isoString: string | null | undefined): string => {
  if (!isoString) return "N/A";

  const resetDate = new Date(isoString);
  if (Number.isNaN(resetDate.getTime())) return "N/A";

  return resetDate.toLocaleString();
};

interface PaygBalanceWidgetProps {
  paygBalance: PaygInfo | null | undefined;
  isLoading: boolean;
}

function PaygBalanceWidget({ paygBalance, isLoading }: PaygBalanceWidgetProps) {
  if (!paygBalance) return null;

  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-[#aaa]">PAYG Balance</span>
        <span className="text-[11px] text-white">
          {isLoading ? "..." : `$${formatCredits(paygBalance.total)}`}
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
          Top-up: ${formatCredits(paygBalance.topUp)}
        </span>
        <span className="text-[9px] text-[#666]">
          Bonus: ${formatCredits(paygBalance.bonus)}
        </span>
      </div>
    </div>
  );
}

interface AccountStatusWidgetProps {
  status: string | undefined;
  planTier: string | undefined;
}

function AccountStatusWidget({ status, planTier }: AccountStatusWidgetProps) {
  const statusColor =
    status === "healthy"
      ? "#10b981"
      : status === "monitored"
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div
      className="flex items-center gap-1.5 p-2 rounded-md mt-2"
      style={{ backgroundColor: `${statusColor}20` }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: statusColor }}
      />
      <span className="text-[11px]" style={{ color: statusColor }}>
        Account: {status || "unknown"}
      </span>
      {planTier && (
        <span className="text-[10px] text-[#666]">
          {planTier.toUpperCase()} Plan
        </span>
      )}
    </div>
  );
}

interface FlowRateWidgetProps {
  flowRate: number | undefined;
}

function FlowRateWidget({ flowRate }: FlowRateWidgetProps) {
  if (flowRate === undefined || flowRate === 0) return null;

  return (
    <div className="flex justify-between p-2 bg-[#3d3d3d] rounded-md mt-2">
      <span className="text-[10px] text-[#888]">Flow Rate</span>
      <span className="text-[10px] text-white">
        ${flowRate.toFixed(5)} / Flow
      </span>
    </div>
  );
}

export function UsageDisplay({
  provider,
  appId,
}: {
  provider: Provider | null;
  appId: AppId;
}) {
  const { data, isLoading, isFetching, error, apiKey, usagePercentage, lastQueriedAt } =
    useProviderSubscription(provider, appId);
  const [now, setNow] = React.useState(Date.now());

  // 每 30 秒更新当前时间
  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const showRefreshing = isFetching;
  const showLastRefreshed = !showRefreshing && lastQueriedAt;

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
          No API key configured
        </div>
      </div>
    );
  }

  if (isLoading || (isFetching && !data)) {
    return (
      <div className="px-2 py-2 border-t border-[#3d3d3d]">
        <div className="text-[11px] text-[#666] mb-2">Usage</div>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin h-4 w-4 border-2 border-[#666] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-2 py-2 border-t border-[#3d3d3d]">
        <div className="text-[11px] text-[#666] mb-2">Usage</div>
        <div className="text-[10px] text-red-400 text-center py-4">
          Failed to load usage data
        </div>
      </div>
    );
  }

  const { window5h, window7d, paygBalance, accountStatus, planTier, flowRate } = data;
  const percent = usagePercentage ?? 0;
  const barColor = getUsageColor(percent);
  const unit = data.unit || "units";

  return (
    <div className="px-3 py-2 border-t border-[#3d3d3d]">
      <div className="flex items-center gap-1.5 text-[10px] text-[#666] uppercase mb-2">
        <span>Usage {data.planName ? `(${data.planName})` : ""}</span>
        {showRefreshing ? (
          <RefreshCw size={10} className="animate-spin" />
        ) : showLastRefreshed ? (
          <span className="text-[9px] normal-case font-normal text-[#555]">
            {formatRelativeTime(lastQueriedAt, now)}
          </span>
        ) : null}
      </div>

      {/* 5-Hour Window */}
      {window5h && (
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-[11px] text-[#aaa]">5-Hour Window</span>
            <span className="text-[11px] text-white">
              {formatFlows(window5h.used)} / {formatFlows(window5h.total)} {unit}
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
              {window5h.usedValue !== undefined
                ? `$${window5h.usedValue.toFixed(2)} / $${window5h.maxValue?.toFixed(2) || "?"}`
                : `${((percent) || 0).toFixed(2)}% used`}
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
              Resets in {formatResetTimeFromISO(data.resetsAt)}
            </span>
          </div>
        </div>
      )}

      {/* 7-Day Window */}
      {window7d && (
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-[11px] text-[#aaa]">7-Day Window</span>
            <span className="text-[11px] text-white">
              {formatFlows(window7d.used)} / {formatFlows(window7d.total)} {unit}
            </span>
          </div>
          <div className="h-1.5 bg-[#3d3d3d] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getUsageColor(
                window7d.total > 0 ? (window7d.used / window7d.total) * 100 : 0,
              )}`}
              style={{
                width: `${window7d.total > 0 ? (window7d.used / window7d.total) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[9px] text-[#666]">
              {window7d.usedValue !== undefined
                ? `$${window7d.usedValue.toFixed(2)} / $${window7d.maxValue?.toFixed(2) || "?"}`
                : ""}
            </span>
            <span
              className="text-[9px]"
              style={{
                color: getUsageHexColor(
                  window7d.total > 0 ? (window7d.used / window7d.total) * 100 : 0,
                ),
              }}
            >
              {window7d.total > 0
                ? ((window7d.used / window7d.total) * 100).toFixed(2)
                : 0}% used
            </span>
          </div>
          <div className="flex justify-end mt-0.5">
            <span className="text-[9px] text-[#666]">
              Resets on {formatResetDateFromISO(data.resetsAtWeekly)}
            </span>
          </div>
        </div>
      )}

      {/* PAYG Balance */}
      {paygBalance && <PaygBalanceWidget paygBalance={paygBalance} isLoading={false} />}

      {/* Account Status */}
      {(accountStatus || planTier) && (
        <AccountStatusWidget status={accountStatus} planTier={planTier} />
      )}

      {/* Flow Rate */}
      {flowRate !== undefined && flowRate > 0 && (
        <FlowRateWidget flowRate={flowRate} />
      )}
    </div>
  );
}
