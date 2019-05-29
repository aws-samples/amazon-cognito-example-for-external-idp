#!/usr/bin/env bash

set -e
source ./env.sh
cd ./cdk/
echo "building cdk"
npm run build

echo "generating CFN"
cdk synth
