FROM node:22-alpine
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
ENV PORT=3001
CMD ["npm", "start"]
