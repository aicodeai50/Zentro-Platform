FROM node:20-alpine

WORKDIR /app

COPY zentro-platform/package*.json ./
RUN npm install

COPY zentro-platform ./
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
