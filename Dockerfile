FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY index.js ./
COPY server ./server
COPY seed ./seed
COPY public ./public
ENV NODE_ENV=production DATA_DIR=/app/data PORT=3000
EXPOSE 3000
CMD ["node", "index.js"]
