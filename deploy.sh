#!/usr/bin/env bash

set -e

./build.sh
cd ./cdk/

echo "deploying"
cdk deploy
