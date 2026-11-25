FROM node:24-alpine AS build
WORKDIR /app
COPY --chown=node:node source/ /app/
COPY trusted/ /opt/terabits/
RUN chown node:node /app && mkdir -p /opt/terabits-output && chown node:node /opt/terabits-output
USER node
RUN node /opt/terabits/build.mjs

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/ /app/
COPY trusted/spec.json trusted/start.mjs /opt/terabits/
USER node
CMD ["node", "/opt/terabits/start.mjs"]
