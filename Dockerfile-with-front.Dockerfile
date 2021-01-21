FROM node:current-alpine

ADD frontend-themis/build /user/src/uems/frontend-themis/build

WORKDIR /user/src/uems/gateway
EXPOSE 15450
CMD ["npm", "start"]

COPY gateway/package*.json ./

ENV NODE_ENV=dev

RUN npm install

COPY gateway/. .

