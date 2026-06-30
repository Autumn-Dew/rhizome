## 概述 / Summary

为 Rhizome 添加 **Linux 原生 .deb 打包支持**(原生 Electron,非 Wine)。

> 上游 PR 评审后,二进制产物通过 GitHub Releases 分发,仓库本身保持轻量。

## 改动 / Changes

### 构建配置
- `package.json`:`build.linux` / `build.deb` 完整配置
  - `maintainer` / `vendor` / `category` / `executableName` / `synopsis` / 中文 `description`
  - `.desktop` 文件:含 `MimeType`(MP3/FLAC/WAV/OGG/...)、`StartupWMClass`、`Categories`
  - `deb.depends` 声明所有 Electron 33 运行时依赖
  - `asarUnpack`:把 `music-metadata` 等拆出 asar,避免路径解析问题
- 跨平台 `clean` 脚本(原 PowerShell → `rimraf`)
- 新增 `build:linux` / `build:linux:amd64` / `:arm64` / `:armv7l` / `:all` 脚本

### 依赖降级 / 修复
| 包 | 旧 | 新 | 原因 |
|---|---|---|---|
| `music-metadata` | `^11.12.3` | `^7.14.0` | v11 是纯 ESM(`exports` 只声明 `import`),asar 内 CJS `require` 触发 `ERR_PACKAGE_PATH_NOT_EXPORTED`。v7.14.0 是最后一个 CJS 版,`parseFile` API 完全兼容 |
| `vite` | `^8.0.1` | `^5.4.10` | Vite 8 与 Element Plus 2.13 不兼容(报 `@vue/shared` 解析失败) |
| `electron` | `^41.1.0` | `^33.4.11` | Electron 33 是当前镜像下稳定的 LTS |
| `unplugin-*` | 21.x / 32.x | 0.18.x / 0.27.x | 与 Vite 5 配套 |

### 新增
- `build/icons/` —— 6 档 hicolor 图标(16/32/48/64/128/256)
- `scripts/build-linux-all.js` —— 多架构 deb 批量构建
- `disk/` —— 源码 tarball(去掉 `node_modules` / `dist`)
- `releases/` —— 校验和 + 指向 GitHub Releases 的说明
- `NOTICE.md` —— 标注本分支相对上游的差异

### 排除
- `.gitignore` 排除 vite 自动生成的 `components.d.ts` / `auto-imports.d.ts`

## deb 验证

```bash
$ dpkg-deb -I Rhizome-1.1.0-amd64.deb
 Package: rhizome
 Version: 1.1.0
 Architecture: amd64
 Maintainer: AutumnDew <autumndew@rhizome.local>
 Depends: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0
 Description: 简约的本地音乐播放器

$ dpkg -i Rhizome-1.1.0-amd64.deb && rhizome   # ✅ 正常启动
```

## 下载

二进制 deb 在 [Releases v1.1.0](https://github.com/zhangjiabo522/rhizome/releases/tag/v1.10):
- `Rhizome-1.1.0-amd64.deb` (77 MB · SHA256 `5787d7fa195c6032ccdd22c53a84b31b`)

## 兼容性

- 源码 100% 兼容(只动 `package.json` 配置 / 依赖版本)
- `electron/main.js`、`electron/preload.js` 一行没改 —— v7 与 v11 的 `mm.parseFile(...)` API 签名完全一致
- Windows NSIS 配置、`npm run build`(原 Windows 流程)未受影响

## 维护

- 上游:https://github.com/Autumn-Dew/rhizome
- 本 fork:https://github.com/zhangjiabo522/rhizome
- issue 反馈:优先在上游提,跨平台相关可在本 fork 提
