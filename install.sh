#!/bin/bash

if [[ -z "$HTTP_PROXY_USERNAME" ]]; then
  echo "please ensure that you have set the environment variable \$HTTP_PROXY_USERNAME"
  exit 1
fi

if [[ -z "$HTTP_PROXY_PASSWORD" ]]; then
  echo "please ensure that you have set the environment variable \$HTTP_PROXY_PASSWORD"
  exit 1
fi

USERNAME="$HTTP_PROXY_USERNAME"
PASSWORD="$HTTP_PROXY_PASSWORD"

HERE=$(dirname .)

echo "setting up environment"
unset HTTP_PROXY
unset HTTPS_PROXY
unset http_proxy
unset https_proxy
export GIT_CURL_VERBOSE=1
export GIT_TRACE=1

export http_proxy=http://$USERNAME:$PASSWORD@lct-web-01.internal.local:80
export https_proxy=http://$USERNAME:$PASSWORD@lct-web-01.internal.local:80

echo "setting up npm"
npmAuth=$(curl -s -k -u $USERNAME:$PASSWORD https://cdc-aphmv-dev.comsuper.int/artifactory/api/npm/auth)

cat <<EOF > ~/.npmrc
$npmAuth
registry=https://cdc-aphmv-dev.comsuper.int/artifactory/api/npm/virtual-npm/
strict-ssl=false
EOF

openssl version
curl --version
git --version

echo "setting up git"
git config --global http.proxyAuthMethod 'basic'
git config --global http.proxy "http://$USERNAME:$PASSWORD@lct-web-01.internal.local:80"
git config --global https.proxy "http://$USERNAME:$PASSWORD@lct-web-01.internal.local:80"
git config --global http.sslVerify "false"
git config --global url."https://github.com/".insteadOf git@github.com:
git config --global url."https://".insteadOf git://
git config --global url."https://github.com".insteadOf ssh://git@github.com
git config --global http.sslBackend "openssl"
git config --global color.ui true

echo "installing npm dependancies"
npm install -ddddd
