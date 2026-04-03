# Generic Usage Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor tray popup usage display to support multiple providers (ZenMux, MiniMax) through a unified extractor script approach with flexible rendering.

**Architecture:** Replace ZenMux专用API with generic `useProviderSubscription` hook that uses the same `queryProviderUsage` command as other providers. UsageDisplay renders widgets based on which fields are present in the response.

**Tech Stack:** React, TypeScript, TanStack Query, Tauri

---

## File Structure

- **Modified:** `src/types.ts` - Extend `UsageData` interface
- **Modified:** `src/components/tray-popup/ProviderList.tsx` - Use generic hook
- **Modified:** `src/components/tray-popup/UsageDisplay.tsx` - Use generic hook + flexible rendering
- **Created:** `src/components/tray-popup/useProviderSubscription.ts` - Generic hook

---

## Task 1: Extend UsageData Type

**Files:**
- Modify: `src/types.ts:76-93`

- [ ] **Step 1: Read current UsageData interface**

Run: Read `src/types.ts` lines 76-93

- [ ] **Step 2: Add new interfaces before UsageData**

Add after line 75 (`// 用量查询结果（支持多套餐）`):

```typescript
// 时间窗口用量
export interface WindowUsage {
  total: number;
  used: number;
  remaining: number;
  usedValue?: number;  // ZenMux特有（美元价值）
  maxValue?: number;   // ZenMux特有
}

// PAYG信息
export interface PaygInfo {
  total: number;
  topUp: number;
  bonus: number;
}
```

- [ ] **Step 3: Extend UsageData interface**

Replace the existing `UsageData` interface with:

```typescript
// 单个套餐用量数据
export interface UsageData {
  planName?: string;
  extra?: string;
  isValid?: boolean;
  invalidMessage?: string;
  total?: number;
  used?: number;
  remaining?: number;
  unit?: string;

  // 时间窗口
  window5h?: WindowUsage;
  window7d?: WindowUsage;
  resetsAt?: string | null;       // 5-hour window 重置时间 (ISO string)
  resetsAtWeekly?: string | null; // 7-day window 重置时间

  // 账户信息
  accountStatus?: string;         // healthy/monitored/suspended
  planTier?: string;             // free/pro/max/ultra

  // PAYG
  paygBalance?: PaygInfo;

  // ZenMux 特有
  flowRate?: number;              // USD per flow
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat(usage): extend UsageData with window5h, window7d, resetsAt, paygBalance fields"
```

---

## Task 2: Create useProviderSubscription Hook

**Files:**
- Create: `src/components/tray-popup/useProviderSubscription.ts`
- Read: `src/lib/api/usage.ts` (for usageApi.query signature)
- Read: `src/components/tray-popup/useZenmuxSubscription.ts` (for reference)

- [ ] **Step 1: Read usageApi.query signature**

Run: Read `src/lib/api/usage.ts` lines 17-21

- [ ] **Step 2: Read useZenmuxSubscription for reference**

Run: Read `src/components/tray-popup/useZenmuxSubscription.ts`

- [ ] **Step 3: Create useProviderSubscription.ts**

Create file `src/components/tray-popup/useProviderSubscription.ts`:

```typescript
import { useQuery, useMemo } from "@tanstack/react-query";
import { usageApi } from "@/lib/api/usage";
import type { UsageData } from "@/types";
import type { AppId } from "@/lib/api/types";

interface UseProviderSubscriptionOptions {
  logLabel?: string;
}

interface UseProviderSubscriptionResult {
  data: UsageData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  apiKey: string | null;
  usagePercentage: number | null;
}

export function useProviderSubscription(
  provider: { id: string; meta?: { usage_script?: { apiKey?: string; enabled?: boolean } } } | null,
  appId: AppId,
  options?: UseProviderSubscriptionOptions,
): UseProviderSubscriptionResult {
  const usageScript = provider?.meta?.usage_script;
  const apiKey = usageScript?.apiKey?.trim() || null;
  const enabled = Boolean(apiKey && usageScript?.enabled && provider?.id);

  const query = useQuery({
    queryKey: ["providerSubscription", provider?.id ?? "", apiKey ?? ""],
    queryFn: async () => {
      if (options?.logLabel) {
        console.info(`[TrayPopup][${options.logLabel}]`, {
          providerId: provider?.id ?? "",
        });
      }

      const result = await usageApi.query(provider!.id, appId);
      if (!result.success) {
        throw new Error(result.error || "Query failed");
      }
      return result.data?.[0];
    },
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // 计算 usage percentage：优先使用 5h，其次 7d，最后 fallback 到 total/used
  const usagePercentage = useMemo(() => {
    const d = query.data;
    if (d?.window5h?.total && d.window5h.total > 0) {
      return (d.window5h.used / d.window5h.total) * 100;
    }
    if (d?.window7d?.total && d.window7d.total > 0) {
      return (d.window7d.used / d.window7d.total) * 100;
    }
    if (d?.total && d.total > 0 && d.used !== undefined) {
      return (d.used / d.total) * 100;
    }
    return null;
  }, [query.data]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    apiKey,
    usagePercentage,
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/tray-popup/useProviderSubscription.ts
git commit -m "feat(tray-popup): add generic useProviderSubscription hook"
```

---

## Task 3: Refactor ProviderList to Use Generic Hook

**Files:**
- Modify: `src/components/tray-popup/ProviderList.tsx`
- Read: `src/components/tray-popup/ProviderList.tsx` (before modification)

- [ ] **Step 1: Read current ProviderList.tsx**

Run: Read `src/components/tray-popup/ProviderList.tsx`

- [ ] **Step 2: Replace useZenmuxSubscription import with useProviderSubscription**

Change:
```typescript
import { useZenmuxSubscription } from "./useZenmuxSubscription";
```
To:
```typescript
import { useProviderSubscription } from "./useProviderSubscription";
import type { AppId } from "@/lib/api/types";
```

- [ ] **Step 3: Update ProviderUsageBadgeProps interface**

Change to accept `appId` prop:
```typescript
interface ProviderUsageBadgeProps {
  provider: Provider;
  appId: AppId;
}
```

- [ ] **Step 4: Update ProviderUsageBadge function**

Replace the function body:

```typescript
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
```

- [ ] **Step 5: Update ProviderRow to pass appId**

Find the ProviderRow component and add `appId` to ProviderUsageBadge:

```typescript
<ProviderUsageBadge provider={provider} appId={activeApp as AppId} />
```

But first we need to pass `appId` down. Update ProviderRow interface:

```typescript
interface ProviderRowProps {
  provider: Provider;
  isCurrent: boolean;
  isSwitching: boolean;
  onProviderSwitch: (providerId: string) => Promise<void>;
  appId: AppId;
}
```

And update the function signature and usage.

- [ ] **Step 6: Update ProviderListProps and render**

Add `appId` to ProviderListProps:
```typescript
interface ProviderListProps {
  providers: Provider[];
  currentProviderId: string;
  switchingProviderId: string | null;
  isLoading: boolean;
  onProviderSwitch: (providerId: string) => Promise<void>;
  appId: AppId;
}
```

Update ProviderRow calls:
```typescript
<ProviderRow
  key={provider.id}
  provider={provider}
  isCurrent={provider.id === currentProviderId}
  isSwitching={switchingProviderId === provider.id}
  onProviderSwitch={onProviderSwitch}
  appId={appId}
/>
```

- [ ] **Step 7: Update TrayPopup.tsx to pass appId**

Run: Read `src/components/tray-popup/TrayPopup.tsx`

Change:
```typescript
<ProviderList
  providers={providers}
  currentProviderId={currentProviderId}
  switchingProviderId={switchingProviderId}
  isLoading={isLoading}
  onProviderSwitch={handleProviderSwitch}
/>
```

To:
```typescript
<ProviderList
  providers={providers}
  currentProviderId={currentProviderId}
  switchingProviderId={switchingProviderId}
  isLoading={isLoading}
  onProviderSwitch={handleProviderSwitch}
  appId={activeApp as AppId}
/>
```

- [ ] **Step 8: Commit**

```bash
git add src/components/tray-popup/ProviderList.tsx src/components/tray-popup/TrayPopup.tsx
git commit -m "feat(tray-popup): ProviderList uses generic useProviderSubscription"
```

---

## Task 4: Refactor UsageDisplay to Use Generic Hook + Flexible Rendering

**Files:**
- Modify: `src/components/tray-popup/UsageDisplay.tsx`
- Read: `src/components/tray-popup/UsageDisplay.tsx` (before modification)

- [ ] **Step 1: Read current UsageDisplay.tsx**

Run: Read `src/components/tray-popup/UsageDisplay.tsx`

- [ ] **Step 2: Replace imports**

Change:
```typescript
import { useQuery } from "@tanstack/react-query";
import type { Provider } from "@/types";
import { zenmuxApi } from "@/lib/api";
import type { PaygBalance } from "@/lib/api/zenmux";
import { useZenmuxSubscription } from "./useZenmuxSubscription";
```

To:
```typescript
import type { Provider } from "@/types";
import { useProviderSubscription } from "./useProviderSubscription";
import type { AppId } from "@/lib/api/types";
import type { WindowUsage, PaygInfo } from "@/types";
```

- [ ] **Step 3: Add helper functions (keep existing helpers but add new ones)**

Add after the existing helper functions:

```typescript
const formatWindowUsage = (
  window: WindowUsage | undefined,
  unit: string,
  formatFn: (n: number) => string,
): { total: string; used: string; remaining: string } | null => {
  if (!window) return null;
  return {
    total: formatFn(window.total),
    used: formatFn(window.used),
    remaining: formatFn(window.remaining),
  };
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
```

- [ ] **Step 4: Add PaygBalanceWidget component**

Add after the helper functions:

```typescript
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
```

- [ ] **Step 5: Add AccountStatusWidget component**

```typescript
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
```

- [ ] **Step 6: Add FlowRateWidget component**

```typescript
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
```

- [ ] **Step 7: Rewrite main UsageDisplay component**

Replace the entire `UsageDisplay` function with:

```typescript
export function UsageDisplay({
  provider,
  appId,
}: {
  provider: Provider | null;
  appId: AppId;
}) {
  const { data, isLoading, isFetching, error, apiKey, usagePercentage } =
    useProviderSubscription(provider, appId);

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
      <div className="text-[10px] text-[#666] uppercase mb-2">
        Usage {data.planName ? `(${data.planName})` : ""}
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
```

- [ ] **Step 8: Update TrayPopup.tsx to pass appId to UsageDisplay**

Change:
```typescript
<UsageDisplay provider={currentProvider} />
```

To:
```typescript
<UsageDisplay provider={currentProvider} appId={activeApp as AppId} />
```

- [ ] **Step 9: Commit**

```bash
git add src/components/tray-popup/UsageDisplay.tsx src/components/tray-popup/TrayPopup.tsx
git commit -m "feat(tray-popup): UsageDisplay uses generic hook with flexible rendering"
```

---

## Task 5: Test and Verify

**Files:**
- Test manually by running the app

- [ ] **Step 1: Build and run the app**

```bash
cd /Users/kuicao/Applications/cc-switch-status
pnpm tauri dev
```

- [ ] **Step 2: Test ZenMux provider**
- Select a ZenMux provider
- Verify 5-Hour Window displays correctly
- Verify 7-Day Window displays correctly
- Verify PAYG Balance displays (if configured)
- Verify Account Status displays
- Verify Flow Rate displays

- [ ] **Step 3: Test MiniMax provider**
- Select a MiniMax provider
- Verify 5-Hour Window displays correctly
- Verify 7-Day Window displays correctly
- Verify no PAYG/Account Status/Flow Rate (not in response)

- [ ] **Step 4: Verify ProviderList badges**
- Each provider should show 5-hour usage percentage
- Colors should be correct based on usage level

---

## Verification Checklist

- [ ] ZenMux: 5-Hour Window shows flows and USD values
- [ ] ZenMux: 7-Day Window shows flows and USD values
- [ ] ZenMux: PAYG Balance displays if available
- [ ] ZenMux: Account Status badge displays
- [ ] ZenMux: Flow Rate displays
- [ ] MiniMax: 5-Hour Window shows calls
- [ ] MiniMax: 7-Day Window shows calls
- [ ] MiniMax: No PAYG/Account Status/Flow Rate widgets
- [ ] ProviderList: All providers show usage percentage badge
- [ ] No console errors
