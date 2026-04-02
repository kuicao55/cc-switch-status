# CC Switch

基于官方 `3.12.3` 版本的自定义版本。

## 相比原版本新增

- Tray popup 内的 provider 点击切换已恢复可用。
- `Providers` 后面的剩余额度会按各自 provider 独立显示。
- `USAGE (ZENMUX)` 会随当前 provider 切换并同步刷新。
- 没有配置 `Configure Usage Query` 的 provider 不显示 usage 数据。
- 切换 provider 后主界面会立即刷新。
- `Monthly Quota` 已替换为 `PAYGO`。

## macOS 安装

1. 退出正在运行的 CC Switch。
2. 将本仓库构建出的 `CC Switch.app` 复制到 `/Applications/CC Switch.app`。
3. 如果系统里已有同名应用，直接覆盖即可。
4. 从“应用程序”中启动新版本。

