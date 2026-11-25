FROM node:24-alpine AS build
WORKDIR /app
COPY --chown=node:node source/ /app/
COPY trusted/ /opt/terabits/
RUN chown node:node /app && mkdir -p /opt/terabits-output && chown node:node /opt/terabits-output
USER node
RUN node /opt/terabits/build.mjs

FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime
COPY trusted/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /opt/terabits-output/ /usr/share/nginx/html/
EXPOSE 8080
