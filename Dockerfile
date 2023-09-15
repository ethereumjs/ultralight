FROM node:18-alpine as BUILD_IMAGE

RUN apk update && apk add --no-cache bash g++ make git python3 && rm -rf /var/cache/apk/*

RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2

RUN npm i --omit-dev

COPY . .

ENTRYPOINT ["node /ultralight/packages/cli/dist/index.js"]