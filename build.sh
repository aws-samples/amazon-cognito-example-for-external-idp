#!/usr/bin/env bash

set -e

cd ./lambda/

echo "building lambda"
npm run build

echo "running unit tests"
npm run test

echo "packing lambda using webpack"
./node_modules/.bin/webpack

cd ../cdk/
echo "building cdk"
npm run build
