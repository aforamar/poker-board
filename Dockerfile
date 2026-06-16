# ---- build stage: install deps and build the React client ----
FROM node:20-alpine AS build
WORKDIR /app

# Copy the whole tree before installing: the lockfiles may still reference the
# old "file:.." self-link, so npm needs the parent package.json present to
# reconcile cleanly. (.dockerignore keeps node_modules/dist/data out.)
COPY . .
RUN npm install --prefix server && npm install --prefix client && npm run build --prefix client

# ---- runtime stage: server + built client only ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3002

COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist

# Runtime data (db.json) lives here; mount a PersistentVolume at this path.
RUN mkdir -p /app/server/data

EXPOSE 3002
CMD ["node", "server/src/index.js"]
