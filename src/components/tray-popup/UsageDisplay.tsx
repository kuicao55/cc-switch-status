import React from "react";

interface UsageDisplayProps {}

// Mock data matching ZenMux subscription response structure
const mockUsageData = {
  "5h": { used: 2.5, total: 10, unit: "h" },
  "7d": { used: 15, total: 50, unit: "h" },
  monthly: { used: 45, total: 200, unit: "h" },
  accountStatus: "Active",
  planName: "Pro Plan",
};

const getUsagePercentage = (used: number, total: number): number => {
  if (total === 0) return 0;
  return Math.min((used / total) * 100, 100);
};

const getUsageColor = (percentage: number): string => {
  if (percentage < 30) return "bg-green-400";
  if (percentage < 70) return "bg-yellow-400";
  return "bg-red-400";
};

const formatUsage = (used: number, unit: string): string => {
  return `${used.toFixed(1)}${unit}`;
};

export function UsageDisplay({}: UsageDisplayProps) {
  const { "5h": h5, "7d": d7, monthly, accountStatus, planName } = mockUsageData;

  const h5Percent = getUsagePercentage(h5.used, h5.total);
  const d7Percent = getUsagePercentage(d7.used, d7.total);
  const monthlyPercent = getUsagePercentage(monthly.used, monthly.total);

  return (
    <div className="px-2 py-2 border-t border-[#3d3d3d]">
      <div className="text-[11px] text-[#666] mb-2">Usage</div>

      {/* 5-Hour Window */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-[#888] mb-1">
          <span>5-Hour Window</span>
          <span>
            {formatUsage(h5.used, h5.unit)} / {formatUsage(h5.total, h5.unit)}
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
            {formatUsage(d7.used, d7.unit)} / {formatUsage(d7.total, d7.unit)}
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
            {formatUsage(monthly.used, monthly.unit)} / {formatUsage(monthly.total, monthly.unit)}
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