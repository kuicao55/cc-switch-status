# Tray Popup Enhancements Design

**Date:** 2026-04-07
**Status:** Approved

## Goal

为托盘弹窗添加三个增强功能：点击外部关闭、打开时刷新数据、自动刷新间隔支持。

## Architecture

采用前端主导方案，修改集中在 React 组件和 hooks 层，不需要改动 Rust 后端代码。

## Components

### 1. TrayPopup.tsx

主弹窗组件，负责：
- 监听 `window.blur` 事件实现点击外部关闭
- 组件挂载时触发数据刷新

### 2. useProviderSubscription.ts

Provider 用量查询 hook，负责：
- 添加 `refetchInterval` 支持自动刷新
- 读取 `autoQueryInterval` 配置

## Data Flow

```
用户点击托盘图标
       ↓
Rust 创建/显示弹窗窗口
       ↓
TrayPopup 组件挂载
       ↓
┌──────────────────────────────┐
│ 1. 监听 window.blur 事件     │ → 点击外部 → 隐藏弹窗
│ 2. refetchQueries 刷新数据   │ → Provider 列表 + Usage
│ 3. useProviderSubscription   │ → 自动刷新（按配置间隔）
└──────────────────────────────┘
```

## Implementation Details

### Feature 1: 点击外部关闭

**文件:** `src/components/tray-popup/TrayPopup.tsx`

```typescript
useEffect(() => {
  const handleBlur = async () => {
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

**关键点:**
- 延迟 100ms 关闭，避免点击弹窗内部元素时误触发
- 使用 `hide()` 而非 `close()`，复用现有窗口

### Feature 2: 打开时刷新

**文件:** `src/components/tray-popup/TrayPopup.tsx`

```typescript
useEffect(() => {
  const refreshOnOpen = async () => {
    console.info("[TrayPopup] Refreshing data on popup open");
    await queryClient.refetchQueries({ queryKey: ["providers", activeApp] });
    await queryClient.refetchQueries({ queryKey: ["providerSubscription"] });
  };

  refreshOnOpen();
}, []);
```

**关键点:**
- 组件挂载时触发刷新
- 并行刷新 Provider 列表和 Usage 数据

### Feature 3: 自动刷新间隔

**文件:** `src/components/tray-popup/useProviderSubscription.ts`

```typescript
export function useProviderSubscription(
  provider: { id: string; meta?: { usage_script?: {
    apiKey?: string;
    enabled?: boolean;
    autoQueryInterval?: number;
  } } } | null,
  appId: AppId,
  options?: UseProviderSubscriptionOptions,
): UseProviderSubscriptionResult {
  const usageScript = provider?.meta?.usage_script;
  const apiKey = usageScript?.apiKey?.trim() || null;
  const autoQueryInterval = usageScript?.autoQueryInterval || 0;
  const enabled = Boolean(apiKey && usageScript?.enabled && provider?.id);

  const query = useQuery({
    queryKey: ["providerSubscription", provider?.id ?? "", apiKey ?? ""],
    queryFn: async () => { ... },
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: autoQueryInterval > 0
      ? Math.max(autoQueryInterval, 1) * 60 * 1000
      : false,
    refetchIntervalInBackground: true,
  });
  ...
}
```

**关键点:**
- 读取 `usage_script.autoQueryInterval` 配置
- `0` 表示禁用自动刷新
- 最小间隔 1 分钟
- 后台也继续定时查询

## Error Handling

| 场景 | 处理方式 |
|------|----------|
| 刷新失败 | 保持现有数据显示，不阻塞用户操作 |
| 网络错误 | React Query 自动重试（retry: 1） |
| API Key 无效 | 显示 "No API key configured" |

## Testing Strategy

### 手动测试

1. **点击外部关闭**
   - 打开弹窗，点击桌面或其他应用 → 弹窗应关闭
   - 点击弹窗内按钮 → 弹窗不应关闭

2. **打开时刷新**
   - 在主界面修改 provider 配置
   - 打开弹窗 → 应显示最新数据

3. **自动刷新**
   - 设置 `autoQueryInterval = 1`
   - 打开弹窗，等待 1 分钟 → 数据应自动刷新

### 单元测试

- 测试 `useProviderSubscription` hook 的 `refetchInterval` 计算逻辑

## Out of Scope

- Rust 后端修改
- 新增 UI 元素
- 修改现有 provider 切换逻辑
- 主界面的用量显示修改
