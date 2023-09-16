FROM node:18-alpine as BUILD_IMAGE

RUN apk update && apk add --no-cache bash g++ make git python3 && rm -rf /var/cache/apk/*
RUN apk add --virtual .build-deps alpine-sdk jq

RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2

WORKDIR /ultralight

RUN jq -r '.workspaces |= .[0:2]' package.json > package.json
COPY package*.json ./
COPY . .
RUN npm i --omit-dev


FROM node:18-alpine
WORKDIR /ultralight
RUN apk update && apk add --no-cache bash && rm -rf /var/cache/apk/*
COPY --from=BUILD_IMAGE /ultralight/node_modules ./node_modules
COPY --from=BUILD_IMAGE /ultralight/packages/portalnetwork ./packages/portalnetwork
COPY --from=BUILD_IMAGE /ultralight/packages/cli ./packages/cli
COPY --from=BUILD_IMAGE /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2
ENV bindAddress=
ENV rpcPort=
ENV pk=
ENTRYPOINT ["node /packages/cli/dist/index.js"]