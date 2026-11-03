FROM node:22-alpine
WORKDIR /app
COPY public ./public
COPY intake ./intake
COPY infrastructure/server.mjs ./infrastructure/server.mjs
USER node
EXPOSE 8080
CMD ["node", "infrastructure/server.mjs"]
