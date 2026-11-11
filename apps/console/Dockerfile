FROM node:22-alpine AS build

# 仓库前端使用 pnpm（apps/console/pnpm-lock.yaml）；版本与 package.json 的
# packageManager 字段（pnpm@11.28.5）及 CI 保持一致，
# 不得引入 npm 的 package-lock.json 造成双锁文件漂移。
RUN npm install -g pnpm@11.28.5

WORKDIR /workspace/apps/console
ARG REACT_APP_API_BASE_URL=/api
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
# The Compose deployment is served from the site root. Absolute asset URLs
# keep JavaScript and CSS requests correct after a browser refreshes an SPA
# deep link such as /manage/agent-config.
ARG ASSET_PREFIX=/
ENV ASSET_PREFIX=$ASSET_PREFIX
COPY apps/console/package.json apps/console/pnpm-lock.yaml apps/console/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
WORKDIR /workspace
# The console imports node contracts directly from apps/api. Preserve the
# repository layout instead of copying the frontend into an isolated directory.
COPY apps/api/ /workspace/apps/api/
COPY apps/console/ /workspace/apps/console/
WORKDIR /workspace/apps/console
RUN pnpm run build

FROM nginx:1.27-alpine

COPY apps/console/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/console/dist/ /usr/share/nginx/html/

EXPOSE 8080
