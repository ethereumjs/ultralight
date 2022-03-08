FROM node:16-alpine as BUILD_IMAGE
WORKDIR /app
RUN apk update && apk add --no-cache bash && rm -rf /var/cache/apk/*
RUN apk add --virtual .build-deps alpine-sdk

RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2

RUN rm -rf ./packages/browser-client && rm -rf ./packages/proxy
COPY package*.json ./
RUN npm ci -ignore-scripts 
RUN npm prune --production
COPY . .

FROM node:16-alpine
WORKDIR /app
RUN apk update && apk add --no-cache bash && rm -rf /var/cache/apk/*
COPY --from=BUILD_IMAGE /app/node_modules ./node_modules
COPY --from=BUILD_IMAGE /app/packages/discv5 ./packages/discv5
COPY --from=BUILD_IMAGE /app/packages/portalnetwork ./packages/portalnetwork
COPY --from=BUILD_IMAGE /app/packages/cli ./packages/cli
COPY --from=BUILD_IMAGE /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2
ENV nat=
ENV rpcport=
ENV proxy=
CMD node /app/packages/cli/dist/index.js --nat=${nat} --rpcport=${rpcport} --proxy=${proxy} --dataDir="./data"
