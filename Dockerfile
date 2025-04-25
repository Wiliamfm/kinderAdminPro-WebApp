FROM docker.io/oven/bun as base

FROM base as install
USER app
RUN mkdir /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base as release
USER bun
COPY dist /usr/src/app/dist
COPY server /usr/src/app/server

EXPOSE 3000
ENTRYPOINT [ "bun", "/usr/src/app/server/entry.bun.js" ]
