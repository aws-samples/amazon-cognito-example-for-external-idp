#!/usr/bin/env bash

set -e
source ./env.sh

echo "this will perform npm audit --fix on all packages"

echo "folder: lambda/api"
cd lambda
cd api
npm audit fix 
echo "folder: lambda/pretokengeneration"
cd ..
cd pretokengeneration
npm audit fix
cd ../..
echo "folder: cdk"
cd cdk
npm audit fix
cd ..
echo "folder: ui-react"
cd ui-react
npm audit fix
cd ..