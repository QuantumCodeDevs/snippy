# Pin a PocketBase GitHub release. Rebuild to bump.
ARG PB_VERSION=0.40.5

FROM alpine:3.21 AS download
ARG PB_VERSION
ARG TARGETARCH
RUN apk add --no-cache ca-certificates unzip wget \
 && case "${TARGETARCH}" in \
      amd64) ARCH=amd64 ;; \
      arm64) ARCH=arm64 ;; \
      *) echo "unsupported TARGETARCH=${TARGETARCH}" && exit 1 ;; \
    esac \
 && wget -q -O /tmp/pb.zip \
      "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${ARCH}.zip" \
 && unzip /tmp/pb.zip -d /tmp/pb \
 && chmod +x /tmp/pb/pocketbase

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata wget \
 && adduser -D -u 1000 pocketbase
COPY --from=download /tmp/pb/pocketbase /usr/local/bin/pocketbase
COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
 && mkdir -p /pb_data \
 && chown -R pocketbase:pocketbase /pb /pb_data /entrypoint.sh
USER pocketbase
EXPOSE 8090
VOLUME /pb_data
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=10s \
  CMD wget -q -O /dev/null http://127.0.0.1:8090/api/health || exit 1
ENTRYPOINT ["/entrypoint.sh"]
