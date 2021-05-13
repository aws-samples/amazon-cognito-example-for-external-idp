#!/usr/bin/env bash

set -e
source ./env.sh

npm run build --prefix lambda/api
npm run build --prefix lambda/pretokengeneration
npm run build --prefix cdk

echo "Build successful"
