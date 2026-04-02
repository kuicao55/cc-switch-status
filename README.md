# CC Switch

基于官方 `3.12.3` 的自定义版本。

## 这版多了什么

- 系统托盘弹窗里的 provider 可以直接点击切换。
- `Providers` 后面的剩余额度按每个 provider 独立显示。
- `USAGE (ZENMUX)` 会跟随当前 provider 自动切换。
- 只有配置了 `Configure Usage Query` 的 provider 才显示 usage 数据。
- 切换 provider 后主界面会立即刷新。
- `Monthly Quota` 区域已替换为 `PAYGO`。

## macOS 安装

### 从本地仓库安装

1. 克隆仓库到本地。
2. 进入项目目录后安装依赖并构建：

```bash
git clone https://github.com/kuicao55/cc-switch-status.git
cd cc-switch-status
pnpm install
pnpm tauri build
```

3. 构建完成后，找到 `src-tauri/target/release/bundle/macos/CC Switch.app`。
4. 退出正在运行的 CC Switch，然后把这个 `.app` 复制到 `/Applications/CC Switch.app`。

示例命令：

```bash
sudo ditto "src-tauri/target/release/bundle/macos/CC Switch.app" "/Applications/CC Switch.app"
```

### 正式 Release 安装

从 [Releases](https://github.com/kuicao55/cc-switch-status/releases) 页面下载最新的 macOS 安装包。

安装步骤：

1. 打开下载的 `.dmg`。
2. 将 `CC Switch.app` 拖入 `/Applications`。
3. 如果系统提示替换已有应用，先退出旧版再确认覆盖。

可选下载：

- `.zip` 归档包
- 如果你已经把仓库拉到本地，也可以直接使用上面的构建步骤安装到 `/Applications`
