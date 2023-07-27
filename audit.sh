#!/usr/bin/env bash

set -e
source ./env.sh

echo "this will perform npm audit --production on all packages"

echo "folder: lambda/api"
cd lambda
cd api
npm audit  
echo "folder: lambda/pretokengeneration"
cd ..
cd pretokengeneration
npm audit 
cd ../..
echo "folder: cdk"
cd cdk
npm audit 
cd ..
echo "folder: ui-react"
cd ui-react
npm audit 
cd ..