FROM cdc-aphmv-dev.comsuper.int/virtual-docker/node:latest

ARG HTTP_PROXY_USERNAME
ENV HTTP_PROXY_USERNAME $HTTP_PROXY_USERNAME

ARG HTTP_PROXY_PASSWORD
ENV HTTP_PROXY_PASSWORD $HTTP_PROXY_PASSWORD

WORKDIR /usr/src/app

COPY package*.json ./
COPY install.sh ./

RUN chmod +x install.sh
RUN bash install.sh

COPY . .

ENTRYPOINT ["node", "build.js"]
