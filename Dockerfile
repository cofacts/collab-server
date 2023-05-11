# Builds production image for collab-server.

# Stage1: Build collab-server
#
FROM node:18-alpine AS builder
WORKDIR /srv/www

# make node_modules cached.
# Src: https://nodesource.com/blog/8-protips-to-start-killing-it-when-dockerizing-node-js/
#
COPY package.json package-lock.json ./
RUN npm install

# Other files, so that other files do not interfere with node_modules cache
#
COPY . .

RUN npm run build
RUN npm prune --production

# Stage2: Create runner, copy stage1 outputs and other dependencies
#
FROM node:18-alpine

WORKDIR /srv/www
EXPOSE 5001
ENTRYPOINT NODE_ENV=production npm run prod

COPY --from=builder /srv/www/node_modules ./node_modules
COPY --from=builder /srv/www/dist ./dist

# copy monorepo's build outputs
# ref: https://github.com/lerna/lerna/issues/2381
#
COPY --from=builder /srv/www/hocuspocus-extension-elasticsearch/dist ./hocuspocus-extension-elasticsearch/dist

COPY package.json package-lock.json .env ./

# copy monorepo's package.json
# ref: https://github.com/lerna/lerna/issues/2381
#
COPY hocuspocus-extension-elasticsearch/package.json ./hocuspocus-extension-elasticsearch/package.json
