#Bun based image not workin
#FROM docker.io/oven/bun as base
FROM docker.io/node as base

FROM base as install
RUN mkdir /tmp/dev
COPY package.json /tmp/dev/
RUN cd /tmp/dev && npm install --legacy-peer-deps

FROM base as build
WORKDIR /usr/src/app
COPY --from=install /tmp/dev/node_modules node_modules
COPY . .
RUN npm run build

#FROM base as release
FROM docker.io/oven/bun as release
USER bun
WORKDIR /home/bun/
ENV NODE_ENV production
COPY --from=build /usr/src/app/package.json package.json
COPY --from=build /usr/src/app/dist dist 
COPY --from=build /usr/src/app/server server
EXPOSE 3000
ENTRYPOINT [ "bun", "run", "serve" ]
