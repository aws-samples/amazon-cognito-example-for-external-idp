#!/usr/bin/env bash

set -e
source ./env.sh

cd lambda
cd api
npm run build
cd ..
cd pretokengeneration
npm run build
cd ../..
cd cdk
npm run build 
cd ..
echo "Build successful"
