FROM node:16-alpine as BUILD_IMAGE
WORKDIR /app
RUN apk update && apk add --no-cache bash && rm -rf /var/cache/apk/*
RUN apk add --virtual .build-deps alpine-sdk

RUN rm -rf packages/browser-client
RUN rm -rf packages/proxy
RUN rm -rf .git

RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2

RUN npm i --ignore-scripts 
RUN npm prune --production
COPY . .

ENV nat=
ENV rpcport=
ENV proxy=
CMD node ./packages/cli/dist/index.js --nat=${nat} --rpcport=${rpcport} --proxy=${proxy}
