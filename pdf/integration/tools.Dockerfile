ARG NODE_IMAGE=europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node
ARG NODE_TAG=26

FROM ${NODE_IMAGE}:${NODE_TAG}-dev
USER root
RUN apk add --no-cache poppler-utils
ENTRYPOINT []
