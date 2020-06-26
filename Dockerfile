FROM node:12

WORKDIR /user/src/uems/gateway

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 15450
CMD ["node", "src/app.js"]