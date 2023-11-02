FROM node:18-alpine as BUILD_IMAGE

RUN apk update && apk add --no-cache bash g++ make git python3 && rm -rf /var/cache/apk/*
RUN apk add --virtual .build-deps alpine-sdk jq

RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2

WORKDIR /ultralight

RUN jq -r '.workspaces |= .[0:2]' package.json > package.json
COPY package*.json ./
COPY . .
RUN npm i --omit-dev

LABEL org.opencontainers.image.source=https://github.com/acolytec3/ultralight

FROM ubuntu:23.04
RUN apt update && apt-get install nodejs musl-dev -y && ln -s /usr/lib/x86_64-linux-musl/libc.so /lib/libc.musl-x86_64.so.1
COPY --from=BUILD_IMAGE ./ultralight ./ultralight
ENV BINDADDRESS=
ENV RPCPORT=
ENV PK=

ENTRYPOINT node ultralight/packages/cli/dist/index.js --bindAddress=BINDADDRESS --rpcPort=RPCPORT