FROM node:16-alpine as BUILD_IMAGE
WORKDIR /app
RUN apk update && apk add --no-cache bash && rm -rf /var/cache/apk/*
RUN apk add --virtual .build-deps alpine-sdk jq

RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2

RUN rm -rf ./packages/browser-client && rm -rf ./packages/proxy
RUN jq -r '.workspaces |= .[0:2]' package.json > package.json
COPY package*.json ./
RUN npm ci -ignore-scripts 
RUN npm prune --production
COPY . .

FROM node:16-alpine
WORKDIR /app
RUN apk update && apk add --no-cache bash && rm -rf /var/cache/apk/*
COPY --from=BUILD_IMAGE /app/node_modules ./node_modules
COPY --from=BUILD_IMAGE /app/packages/portalnetwork ./packages/portalnetwork
COPY --from=BUILD_IMAGE /app/packages/cli ./packages/cli
COPY --from=BUILD_IMAGE /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2
ENV bindAddress=
ENV rpcPort=
ENV pk=
CMD node /app/packages/cli/dist/index.js --rpcPort=${rpcPort} --bindAddress=${bindAddress} --dataDir="./data" --pk=${pk}