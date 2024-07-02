FROM node:20-alpine
COPY package*.json ./
RUN npm install
WORKDIR /app
COPY . .
EXPOSE 8574
CMD ["node", "BooksServer.js"]