FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
VOLUME ["/app/session"]
EXPOSE 3100
CMD ["npm", "start"]
