#!/usr/bin/env bash

set -e

cd ./cdk/
echo "building cdk"
npm run build

echo "generating CFN"
cdk synth
