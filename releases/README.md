# Releases

> **二进制包(`.deb` / `.AppImage` / 未来其它格式)请到 GitHub Releases 页面下载:**
>
> 👉 https://github.com/zhangjiabo522/rhizome/releases

本目录保留**校验和与说明**,不再直接存放 deb 本身,以保持 git 仓库轻量。

## 当前版本校验和

| 文件 | SHA256 | 来源 |
|---|---|---|
| `Rhizome-1.1.0-amd64.deb` | 见 `SHA256SUMS` | [Releases v1.1.0](https://github.com/zhangjiabo522/rhizome/releases/tag/v1.1.0) |

## 校验下载的 deb

```bash
wget https://github.com/zhangjiabo522/rhizome/releases/download/v1.1.0/Rhizome-1.1.0-amd64.deb
sha256sum -c SHA256SUMS   # 需要把 SHA256SUMS 一起下载
# 或直接对照:
sha256sum Rhizome-1.1.0-amd64.deb
# 期望: 5787d7fa195c6032ccdd22c53a84b31b
```

## 安装

```bash
sudo dpkg -i Rhizome-1.1.0-amd64.deb
rhizome
```

## 架构支持

| 架构 | deb 文件 | 构建命令 |
|---|---|---|
| `amd64` (x86_64) | ✅ v1.1.0 | `npm run build:linux` |
| `arm64` | 🔨 需在 arm64 机器编译 | `npm run build:linux:arm64` |
| `armv7l` | 🔨 需在 armv7l 机器编译 | `npm run build:linux:armv7l` |

arm64 / armv7l deb 发布:在对应架构机器(或 Docker qemu)上执行 `npm run build:linux:arm64` 等命令,然后将产物上传到 GitHub Releases。
