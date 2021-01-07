FROM node:current-alpine

WORKDIR /user/src/uems/gateway
EXPOSE 15450
CMD ["npm", "start"]

COPY package*.json ./

ENV NODE_ENV=dev

RUN npm install

COPY . .

