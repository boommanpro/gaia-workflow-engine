#  Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
#  SPDX-License-Identifier: MIT

rush build
cd apps/docs
npm run docs
cd ../..
cp -r apps/docs/src/zh/auto-docs apps/docs/src/en/auto-docs
cd apps/docs
npm run build
cd ../..
rm -rf docs && mv apps/docs/doc_build docs
