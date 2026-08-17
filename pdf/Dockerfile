# PDF rendering service — own runtime, needs Chromium + system libs (not distroless)
# and installs deps inside the image (host node_modules has macOS-native binaries).
#
# IMPORTANT: build from the REPO ROOT so the context includes app/ + package.json:
#   docker build -f pdf/Dockerfile -t alde-pdf .
FROM mcr.microsoft.com/playwright:v1.61.1-noble

ENV TZ="Europe/Oslo"
ENV PDF_PORT=8090
# Chromium is preinstalled in the base image here:
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# Ghostscript for PDF/A-2b conversion of the rendered PDF.
USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends ghostscript \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Install dependencies (incl. vite — the service resolves modules at runtime).
# --ignore-scripts skips the repo's `prepare` (lefthook, needs git) and browser
# re-download; platform binaries come from optional deps.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Source needed by the runtime Vite SSR + component discovery.
COPY tsconfig.json ./
COPY app/ ./app/
COPY pdf/ ./pdf/

RUN chown -R pwuser:pwuser /app
USER pwuser

EXPOSE 8090

# Node in the base image strips TS types with this flag; server.ts only statically
# imports .ts (the .tsx entry is loaded at runtime by Vite, never by node directly).
CMD ["node", "--experimental-strip-types", "pdf/server.ts"]
