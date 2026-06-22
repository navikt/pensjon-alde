FROM gcr.io/distroless/nodejs24-debian13

ENV TZ="Europe/Oslo"

WORKDIR /app

USER nonroot

COPY node_modules/ node_modules/
COPY build/ build/
COPY app/ app/
COPY server.ts .

CMD ["./server.ts"]
