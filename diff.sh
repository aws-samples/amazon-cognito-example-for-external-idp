#!/usr/bin/env bash

set -e
source ./env.sh

./build.sh

cd cdk
echo "calculating diff"
npm run cdk-diff
cd -
