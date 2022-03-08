FROM node:16-alpine
WORKDIR /app
RUN apk update && apk add --no-cache bash && rm -rf /var/cache/apk/*
COPY package*.json ./
RUN npm i --ignore-scripts
COPY . .
RUN npm run build
RUN npm prune
CMD node dist/index.js --nat=extip --singleNodeMode