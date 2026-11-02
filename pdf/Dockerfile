ARG NODE_IMAGE=europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node
ARG NODE_TAG=26

FROM ${NODE_IMAGE}:${NODE_TAG}-dev AS deps
USER root
WORKDIR /app
COPY package.json pnpm-lock.yaml .pnpmfile.cjs .npmrc pnpm-workspace.yaml ./
RUN npm install -g "$(node -p "require('./package.json').packageManager.split('+')[0]")"
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM ${NODE_IMAGE}:${NODE_TAG}-dev
USER root
RUN apk add --no-cache \
    chromium \
    ghostscript \
    font-liberation \
    tzdata

ENV TZ="Europe/Oslo"
ENV PDF_PORT=8090
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY app/ ./app/
COPY pdf/ ./pdf/

USER node
EXPOSE 8090

ENTRYPOINT ["node"]
CMD ["pdf/server.ts"]
