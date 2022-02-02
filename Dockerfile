FROM node:16-alpine
WORKDIR /app
RUN apk update && apk add --no-cache bash && rm -rf /var/cache/apk/*
RUN apk add --virtual .build-deps alpine-sdk
COPY package*.json ./
RUN npm ci --ignore-scripts --production=only
COPY . .
RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2
ENV nat=
ENV rpcport=
ENV proxy=
CMD npm run start -w=cli -- --nat=${nat} --rpcport=${rpcport} --proxy=${proxy}
