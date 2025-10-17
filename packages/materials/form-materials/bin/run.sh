#!/bin/sh
#  Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
#  SPDX-License-Identifier: MIT

echo "⚠️ 'npx @flowgram.ai/form-materials' is deprecated."
echo "👉 Please use 'npx @flowgram.ai/cli@latest materials' to sync materials"
npx @flowgram.ai/cli@latest materials "$@"
