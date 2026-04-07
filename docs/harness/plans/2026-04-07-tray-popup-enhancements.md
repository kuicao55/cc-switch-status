# Tray Popup Enhancements Implementation Plan

> **Harness note:** This plan is executed via `harness:harness-execution` using the Orchestra / Executor / Reviewer architecture. Each task goes through Executor (TDD implementation) → Spec Reviewer (compliance check) → Code Quality Reviewer (adversarial review). Only Code Quality Review PASS closes a task.

**Goal:** 为托盘弹窗添加点击外部关闭、打开时刷新、自动刷新间隔三个功能。

**Milestone ref:** standalone (small project)

**Architecture:** 前端主导方案，修改 React 组件和 hooks，不涉及 Rust 后端。

**Tech Stack:** React, TypeScript, TanStack Query, Tauri WebviewWindow API

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/tray-popup/TrayPopup.tsx` | Modify | 添加 window.blur 监听和刷新逻辑 |
| `src/components/tray-popup/useProviderSubscription.ts` | Modify | 添加 refetchInterval 支持 |

---

### Task 1: 点击外部关闭弹窗

**Files:**

- Modify: `src/components/tray-popup/TrayPopup.tsx`

- [x] **Step 1: 添加 window.blur 事件监听**

在 `TrayPopup` 组件中添加 `useEffect` 监听窗口失焦事件：

```typescript
// 在现有 useEffect 之后添加新的 useEffect
useEffect(() => {
  const handleBlur = async () => {
    // 延迟 100ms 关闭，避免点击弹窗内部元素时误触发
    setTimeout(async () => {
      const popup = await WebviewWindow.getByLabel("tray_popup");
      if (popup) {
        await popup.hide();
      }
    }, 100);
  };

  window.addEventListener("blur", handleBlur);
  return () => window.removeEventListener("blur", handleBlur);
}, []);
```

- [x] **Step 2: 验证 WebviewWindow 导入存在**

确认文件顶部已有 `WebviewWindow` 导入：
```typescript
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
```

- [x] **Step 3: 手动测试**

1. 构建并运行应用
2. 点击托盘图标打开弹窗
3. 点击桌面或其他应用 → 弹窗应关闭
4. 点击弹窗内按钮 → 弹窗不应关闭

- [x] **Step 4: Commit**

```bash
git add src/components/tray-popup/TrayPopup.tsx
git commit -m "feat(tray-popup): add click-outside-to-dismiss functionality"
```

---

### Task 2: 打开时刷新数据

**Files:**

- Modify: `src/components/tray-popup/TrayPopup.tsx`

- [x] **Step 1: 添加组件挂载时的刷新逻辑**

在 `TrayPopup` 组件中添加 `useEffect` 在挂载时刷新数据：

```typescript
// 在组件顶部，其他 useEffect 之前添加
useEffect(() => {
  // 每次弹窗打开时刷新 Provider 列表和 Usage 数据
  const refreshOnOpen = async () => {
    console.info("[TrayPopup] Refreshing data on popup open");
    await queryClient.refetchQueries({ queryKey: ["providers", activeApp] });
    await queryClient.refetchQueries({ queryKey: ["providerSubscription"] });
  };

  refreshOnOpen();
}, []); // 空依赖数组，仅在挂载时执行
```

- [x] **Step 2: 手动测试**

1. 在主界面修改 provider 配置
2. 打开弹窗 → 应显示最新数据
3. 检查控制台日志 `[TrayPopup] Refreshing data on popup open`

- [x] **Step 3: Commit**

```bash
git add src/components/tray-popup/TrayPopup.tsx
git commit -m "feat(tray-popup): refresh provider and usage data on popup open"
```

---

### Task 3: 自动刷新间隔支持

**Files:**

- Modify: `src/components/tray-popup/useProviderSubscription.ts`

- [x] **Step 1: 添加 autoQueryInterval 参数读取**

修改 `useProviderSubscription` 函数，从 provider 配置中读取 `autoQueryInterval`：

```typescript
export function useProviderSubscription(
  provider: {
    id: string;
    meta?: {
      usage_script?: {
        apiKey?: string;
        enabled?: boolean;
        autoQueryInterval?: number;  // 新增
      };
    };
  } | null,
  appId: AppId,
  options?: UseProviderSubscriptionOptions,
): UseProviderSubscriptionResult {
  const usageScript = provider?.meta?.usage_script;
  const apiKey = usageScript?.apiKey?.trim() || null;
  const autoQueryInterval = usageScript?.autoQueryInterval || 0;  // 新增
  const enabled = Boolean(apiKey && usageScript?.enabled && provider?.id);

  // ... 后续修改
}
```

- [x] **Step 2: 添加 refetchInterval 配置**

修改 `useQuery` 配置，添加 `refetchInterval` 和 `refetchIntervalInBackground`：

```typescript
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
  // 新增：自动刷新间隔
  refetchInterval:
    autoQueryInterval > 0
      ? Math.max(autoQueryInterval, 1) * 60 * 1000
      : false,
  refetchIntervalInBackground: true,
});
```

- [x] **Step 3: 手动测试**

1. 在 provider 配置中设置 `autoQueryInterval = 1`
2. 打开弹窗
3. 等待 1 分钟 → 数据应自动刷新
4. 设置 `autoQueryInterval = 0` → 不应自动刷新

- [x] **Step 4: Commit**

```bash
git add src/components/tray-popup/useProviderSubscription.ts
git commit -m "feat(tray-popup): add auto-refresh interval support for provider subscription"
```

---

## 自检清单

| 检查项 | 状态 |
|--------|------|
| Spec 覆盖 | ✅ 三个功能全部覆盖 |
| 无占位符 | ✅ 所有代码完整 |
| 类型/命名一致性 | ✅ 与现有代码一致 |
