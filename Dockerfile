FROM gcr.io/distroless/nodejs24-debian12

WORKDIR /app

COPY node_modules/ node_modules/
COPY build/ build/
COPY server.ts .

CMD ["./server.ts"]
