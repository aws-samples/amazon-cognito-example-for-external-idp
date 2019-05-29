#!/usr/bin/env bash

set -e
source ./env.sh

./build.sh
cd ./cdk/

echo "deploying"
cdk deploy
