# Build context: repository root.
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download
COPY apps/api/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM alpine:3.20
# LibreOffice enables PDF export; DOCX works without it.
RUN apk add --no-cache ca-certificates libreoffice-writer font-dejavu && adduser -D -u 10001 app
WORKDIR /app
COPY --from=build /out/api /app/api
COPY templates /app/templates
COPY knowledge /app/knowledge
USER app
EXPOSE 8080
ENTRYPOINT ["/app/api"]
