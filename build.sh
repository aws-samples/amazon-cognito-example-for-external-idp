#!/usr/bin/env bash

set -e
source ./env.sh

# ------------------
# API
# ------------------

echo "API"

pushd ./lambda/api/

echo "building..."
npm run build

echo "running tests..."
npm run test

popd

# ------------------
# PreTokenGeneration
# ------------------

echo "Cognito PreTokenGeneration Trigger"

pushd ./lambda/pretokengeneration/

echo "building..."
npm run build

#echo "running tests..."
#npm run test

popd

# ------------------
# Infrastructure
# ------------------
echo "Infrastructure"
pushd ./cdk/

echo "building..."
npm run build

