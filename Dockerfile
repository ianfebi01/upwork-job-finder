FROM node:18.15-alpine3.16

ENV NODE_ENV = production

WORKDIR /usr/app

COPY . /usr/app

RUN yarn install

CMD ["node", "index.js"]
