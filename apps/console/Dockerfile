FROM node:22-alpine AS build

WORKDIR /workspace/apps/console
ARG REACT_APP_API_BASE_URL=/api
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
# The Compose deployment is served from the site root. Absolute asset URLs
# keep JavaScript and CSS requests correct after a browser refreshes an SPA
# deep link such as /manage/agent-config.
ARG ASSET_PREFIX=/
ENV ASSET_PREFIX=$ASSET_PREFIX
COPY apps/console/package.json apps/console/package-lock.json ./
RUN npm ci
WORKDIR /workspace
# The console imports node contracts directly from apps/api. Preserve the
# repository layout instead of copying the frontend into an isolated directory.
COPY apps/api/ /workspace/apps/api/
COPY apps/console/ /workspace/apps/console/
WORKDIR /workspace/apps/console
RUN npm run build

FROM nginx:1.27-alpine

COPY apps/console/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/console/dist/ /usr/share/nginx/html/

EXPOSE 8080
