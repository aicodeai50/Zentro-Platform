FROM node:22-alpine

WORKDIR /app

COPY zentro-platform/package*.json ./
RUN npm ci

COPY zentro-platform ./
RUN npm run build

EXPOSE 8080

CMD ["npm", "run", "start"]
