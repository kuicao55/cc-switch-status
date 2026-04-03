# Generic Usage Display for Multiple Providers - Design

Date: 2026-04-03

## Overview

Refactor the tray popup's usage display system to support multiple providers (ZenMux, MiniMax, and future providers) through a unified extractor script approach. Previously, ZenMux used a dedicated API command while MiniMax used a generic script. Now both will use the generic script approach with flexible rendering based on available fields.

## Architecture

### Current State

1. **ZenMux**: Uses dedicated Tauri command `fetch_zenmux_subscription` → `zenmuxApi.getSubscription()` → `useZenmuxSubscription` hook
2. **MiniMax**: Uses generic `queryProviderUsage` command with extractor script
3. **Problem**: Two different code paths, ZenMux专用API不能从外部修改

### Target State

1. **All providers**: Use extractor scripts stored in `provider.meta.usage_script`
2. **Generic hook**: `useProviderSubscription` handles all providers uniformly
3. **Flexible rendering**: `UsageDisplay` shows widgets based on which fields are present
4. **Backward compatibility**: Existing ZenMux专用API可以保留（暂不删除）

## Data Model

### Extended UsageData Interface

```typescript
// src/types.ts

export interface WindowUsage {
  total: number;
  used: number;
  remaining: number;
  usedValue?: number;  // ZenMux特有（美元价值）
  maxValue?: number;  // ZenMux特有
}

export interface PaygInfo {
  total: number;
  topUp: number;
  bonus: number;
}

export interface UsageData {
  planName?: string;
  extra?: string;
  isValid?: boolean;
  invalidMessage?: string;
  total?: number;
  used?: number;
  remaining?: number;
  unit?: string;

  // ===== 时间窗口 =====
  window5h?: WindowUsage;
  window7d?: WindowUsage;
  resetsAt?: string | null;       // 5-hour window 重置时间 (ISO string)
  resetsAtWeekly?: string | null; // 7-day window 重置时间

  // ===== 账户信息 =====
  accountStatus?: string;         // healthy/monitored/suspended
  planTier?: string;             // free/pro/max/ultra

  // ===== PAYG =====
  paygBalance?: PaygInfo;

  // ===== ZenMux 特有 =====
  flowRate?: number;             // USD per flow
}
```

### Provider Subscription Hook

```typescript
// src/components/tray-popup/useProviderSubscription.ts

interface UseProviderSubscriptionResult {
  data: UsageData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  apiKey: string | null;
  usagePercentage: number | null;  // 基于 window5h 或 window7d 计算
}
```

## UI Components

### ProviderList

- 使用 `useProviderSubscription` 获取 usage percentage
- 根据 `window5h?.used / window5h?.total` 计算百分比
- 颜色逻辑：<30% 绿色，<70% 黄色，>=70% 红色

### UsageDisplay

根据返回数据的字段，渲染对应的 widget：

| 字段存在 | 显示 Widget |
|----------|-------------|
| `window5h` | 5-Hour Window（progress bar + values + reset time） |
| `window7d` | 7-Day Window（progress bar + values + reset time） |
| `paygBalance` | PAYG Balance（credits breakdown） |
| `accountStatus` | Account Status badge |
| `flowRate` | Flow Rate info |

## Extractor Scripts

### ZenMux Extractor

```javascript
({
  request: {
    url: "{{baseUrl}}/subscription/detail",
    method: "GET",
    headers: {
      "Authorization": "Bearer {{apiKey}}",
      "User-Agent": "cc-switch/1.0"
    }
  },
  extractor: function(response) {
    const data = response?.data || {};
    const plan = data.plan || {};
    const quota5h = data.quota_5_hour || {};
    const quota7d = data.quota_7_day || {};
    const now = Date.now();

    function formatDuration(ms) {
      if (ms <= 0) return 'now';
      const h = Math.floor(ms / (1000 * 60 * 60));
      const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      if (h > 0) return h + 'h';
      return m + 'm';
    }

    const expiresAt = plan.expires_at ? new Date(plan.expires_at).getTime() : null;
    const isExpired = expiresAt ? expiresAt <= now : false;
    const isHealthy = data.account_status === 'healthy';

    return {
      isValid: !isExpired && isHealthy,
      invalidMessage: isExpired ? 'Plan expired' : !isHealthy ? 'Account: ' + data.account_status : null,
      remaining: quota5h.remaining_flows ?? 0,
      unit: 'flows',
      planName: plan.tier || "unknown",
      total: quota5h.max_flows ?? 0,
      used: quota5h.used_flows ?? 0,
      extra: quota5h.resets_at ? 'reset in ' + formatDuration(new Date(quota5h.resets_at).getTime() - now) : null,

      window5h: {
        total: quota5h.max_flows ?? 0,
        used: quota5h.used_flows ?? 0,
        remaining: quota5h.remaining_flows ?? 0,
        usedValue: quota5h.used_value_usd ?? 0,
        maxValue: quota5h.max_value_usd ?? 0,
      },
      resetsAt: quota5h.resets_at || null,

      window7d: {
        total: quota7d.max_flows ?? 0,
        used: quota7d.used_flows ?? 0,
        remaining: quota7d.remaining_flows ?? 0,
        usedValue: quota7d.used_value_usd ?? 0,
        maxValue: quota7d.max_value_usd ?? 0,
      },
      resetsAtWeekly: quota7d.resets_at || null,

      accountStatus: data.account_status || "unknown",
      flowRate: data.effective_usd_per_flow ?? 0,

      paygBalance: data.payg_balance ? {
        total: data.payg_balance.total_credits ?? 0,
        topUp: data.payg_balance.top_up_credits ?? 0,
        bonus: data.payg_balance.bonus_credits ?? 0,
      } : null,
    };
  }
})
```

### MiniMax Extractor

```javascript
({
  request: {
    url: "{{baseUrl}}/v1/api/openplatform/coding_plan/remains",
    method: "GET",
    headers: {
      "Authorization": "Bearer {{apiKey}}",
      "Content-Type": "application/json"
    }
  },
  extractor: function(response) {
    const data = typeof response === "string" ? JSON.parse(response) : response;

    let info = data;

    if (data.model_remains && data.model_remains.length > 0) {
      info = data.model_remains[0];
    }

    const total = info.current_interval_total_count || 0;
    const remaining = info.current_interval_usage_count || 0;

    const used = total - remaining;
    const percent = total > 0 ? Math.round((used / total) * 100) : 0;

    const total7d = info.current_weekly_total_count || 0;
    const used7d = info.current_weekly_usage_count || 0;
    const remaining7d = total7d - used7d;

    const toISO = (ts) => {
      if (typeof ts !== 'number') return null;
      const d = new Date(ts);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };

    return {
      isValid: total > 0,
      used,
      remaining,
      total,
      balance: remaining,
      unit: "prompts",
      extra: percent + "%",

      planName: info.model_name || "Coding Plan",

      window5h: {
        total: total,
        used: used,
        remaining: remaining,
      },
      resetsAt: toISO(info.end_time),

      window7d: {
        total: total7d,
        used: used7d,
        remaining: remaining7d,
      },
      resetsAtWeekly: toISO(info.weekly_end_time),
    };
  }
})
```

## File Changes

### Modified Files

1. **src/types.ts** - Extend `UsageData` interface
2. **src/components/tray-popup/ProviderList.tsx** - Use generic hook
3. **src/components/tray-popup/UsageDisplay.tsx** - Use generic hook + flexible rendering

### New Files

1. **src/components/tray-popup/useProviderSubscription.ts** - Generic hook

### Deprecated (Not Deleted - Backward Compatibility)

1. **src/components/tray-popup/useZenmuxSubscription.ts** - Kept but no longer used by tray popup
2. **src/lib/api/zenmux.ts** - Kept but no longer used by tray popup
3. **src-tauri/src/commands/zenmux.rs** - Kept but no longer used

## Acceptance Criteria

1. ProviderList 显示每个 provider 的 5-hour usage percentage（通用 hook）
2. UsageDisplay 根据字段渲染对应 widget
3. ZenMux 显示完整的 5-Hour Window、7-Day Window、PAYG、Account Status、Flow Rate
4. MiniMax 显示 5-Hour Window、7-Day Window（无 PAYG/Account Status 等）
5. 未来其他 provider 只需配置 extractor 脚本即可支持
