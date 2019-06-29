#!/usr/bin/env bash

set -e
source ./env.sh

cd lambda/api && npm run test && cd -
cd lambda/pretokengeneration && npm run test && cd -
