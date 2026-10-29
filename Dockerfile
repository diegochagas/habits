# Habits on the home server: the static site plus server/ (node:http + pg). No build step.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY index.html game.html puzzle.html ./
COPY css ./css
COPY js ./js
COPY data ./data
COPY server ./server
EXPOSE 4180
CMD ["node", "server/main.js"]
