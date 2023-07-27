#!/usr/bin/env bash

echo "folder: lambda/api"
cd lambda
cd api
npm run clean && rm -rf node_modules
cd ..
cd pretokengeneration
echo "folder: lambda/pretokengeneration"
npm run clean && rm -rf node_modules
echo "folder: cdk"
cd ../..
cd cdk
npm run clean && rm -rf node_modules
cd ..
echo "folder: ui-react"
cd ui-react
npm run clean && rm -rf node_modules
cd ..