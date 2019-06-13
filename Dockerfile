# The first instruction in a Dockerfile must be FROM, which selects a base image. Since it's recommended to use official Docker images, we will use the official image for node. We will chose a specific image rather than defaulting to latest as future node versions may break our application.
FROM cdc-aphmv-dev.comsuper.int/virtual-docker/node:12-alpine

ARG HTTP_PROXY_USERNAME
ENV HTTP_PROXY_USERNAME $HTTP_PROXY_USERNAME

ARG HTTP_PROXY_PASSWORD
ENV HTTP_PROXY_PASSWORD $HTTP_PROXY_PASSWORD

# Sets the working directory to /usr/src/app.
WORKDIR /usr/src/app

# Copies the package file for NPM to the working directory.
COPY package*.json ./

# Installs the required NPM packages.
RUN npm install

# Copies the application from the current directory to the working directory of the image.
copy . .

# If an action does not use the runs configuration option, the commands in ENTRYPOINT will execute. The Docker ENTRYPOINT instruction has a shell form and exec form. We will use the exec form of the ENTRYPOINT instruction to call our node script. This will allow us to pass arguments to the script when we run the container.
ENTRYPOINT ["node", "raml-enforcer.js"]
