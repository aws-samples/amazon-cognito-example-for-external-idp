#!/usr/bin/env bash

set -e
source ./env.sh

./build.sh

pushd ./cdk/

echo "deploying"
cdk deploy

popd

echo "generating config for react UI"

./config-ui-react.sh
