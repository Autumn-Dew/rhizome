# Rhizome v1.1.0 · 首次 Linux 原生 deb 发布

## 📥 下载

| 文件 | 大小 | SHA256 |
|---|---|---|
| `Rhizome-1.1.0-amd64.deb` | 78 MB | `5787d7fa195c6032ccdd22c53a84b31b` |

## ✨ 本次更新

- 🐧 **原生 Linux deb 支持** — Electron 33 + hicolor 图标,告别 Wine
- 📦 **apt 友好** — 完整 `Depends` 声明,`sudo apt install` 一键装齐依赖
- 🔧 **修复 asar 启动报错** — `music-metadata` 11.x ESM 降级到 7.14.0 CJS
- ⚡ **Vite 5 + 极速构建** — 国内镜像 5 秒出包

## 🛠️ 安装

```bash
wget https://github.com/zhangjiabo522/rhizome/releases/download/v1.1.0/Rhizome-1.1.0-amd64.deb
sudo dpkg -i Rhizome-1.1.0-amd64.deb
rhizome
```

## 📋 系统要求

- 架构:**amd64** (x86_64)
- 系统:Debian 11+ / Ubuntu 22.04+ (含衍生版)
- 依赖(自动安装):`libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libuuid1 libsecret-1-0`

## 🔍 校验

```bash
sha256sum Rhizome-1.1.0-amd64.deb
# 应输出:5787d7fa195c6032ccdd22c53a84b31b
```

## 📂 仓库结构

- `disk/` — 源码 tarball(无 node_modules / dist)
- `releases/` — 校验和与说明(deb 在 GitHub Releases)
- `scripts/build-linux-all.js` — 多架构 deb 批量构建

## 🙏 致谢

- [Electron](https://www.electronjs.org/)
- [Vue 3](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)
- [music-metadata](https://github.com/Borewit/music-metadata)

—— AutumnDew, 2026-06
