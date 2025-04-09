FROM node:20-alpine

RUN apk update && apk add --no-cache bash g++ make git python3 && rm -rf /var/cache/apk/*
RUN apk add --virtual .build-deps alpine-sdk jq

RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2

WORKDIR /ultralight

COPY .git .git
COPY node_modules node_modules
COPY packages/portalnetwork/dist packages/portalnetwork/dist
COPY packages/cli/dist packages/cli/dist
COPY packages/cli/package.json packages/cli
COPY packages/portalnetwork/package.json packages/portalnetwork

# Sanity check
RUN node /ultralight/packages/cli/dist/index.js --help

ENV BINDADDRESS=
ENV RPCPORT=
ENV PK=

ENTRYPOINT node packages/cli/dist/index.js --bindAddress=BINDADDRESS --rpcPort=RPCPORT