#!/usr/bin/env bash
# 由 build/icon.svg 生成 macOS 图标：icon.png（Tray 提取源 + electron-builder 备用）
# + icon.icns。
# 渲染用 Electron 离屏窗口（qlmanage 缩略图会烘白底，圆角透明保不住）；
# icns 用系统自带 iconutil 打包，中间尺寸用 sips 缩放。
set -euo pipefail
cd "$(dirname "$0")/.."

ELECTRON=node_modules/.bin/electron
[ -x "$ELECTRON" ] || { echo "ERROR: 缺少 electron（先 pnpm install）" >&2; exit 1; }

rm -rf build/icon.iconset build/icon.render.png build/icon.png build/icon.icns

# 1) Electron 离屏渲染 1024px（保留透明）；capturePage 可能带 2x 缩放，统一归一到 1024
"$ELECTRON" scripts/render-icon-electron.js build/icon.svg build/icon.render.png 1024
sips -z 1024 1024 build/icon.render.png >/dev/null
mv build/icon.render.png build/icon.png

# 2) 生成 icns 所需的全部尺寸
mkdir -p build/icon.iconset
for size in 16 32 64 128 256 512; do
  sips -z "$size" "$size" build/icon.png --out "build/icon.iconset/icon_${size}x${size}.png" >/dev/null
done
# retina @2x 尺寸（源为 1024，直接缩）
sips -z 1024 1024 build/icon.png --out build/icon.iconset/icon_512x512@2x.png >/dev/null
cp build/icon.iconset/icon_16x16.png build/icon.iconset/icon_16x16@2x.png
cp build/icon.iconset/icon_32x32.png build/icon.iconset/icon_32x32@2x.png
cp build/icon.iconset/icon_128x128.png build/icon.iconset/icon_128x128@2x.png
cp build/icon.iconset/icon_256x256.png build/icon.iconset/icon_256x256@2x.png
iconutil -c icns build/icon.iconset -o build/icon.icns
rm -rf build/icon.iconset

# 3) 菜单栏模板图：粗笔画黑色 G（32px，macOS 按 16pt@2x 使用，透明底）
"$ELECTRON" scripts/render-icon-electron.js build/tray-template.svg build/tray-template.png 32

echo "OK: build/icon.png + build/icon.icns + build/tray-template.png 已生成"
