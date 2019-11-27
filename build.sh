#!/usr/bin/env bash

set -e
source ./env.sh

npm run build --silent --prefix lambda/api
npm run build --silent --prefix lambda/pretokengeneration
npm run build --silent --prefix cdk
echo build successful
