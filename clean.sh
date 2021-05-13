#!/usr/bin/env bash

echo "folder: lambda/api"
npm run clean --prefix lambda/api && rm -rf lambda/api/node_modules
echo "folder: lambda/pretokengeneration"
npm run clean --prefix lambda/pretokengeneration && rm -rf lambda/pretokengeneration/node_modules
echo "folder: cdk"
npm run clean --prefix cdk && rm -rf cdk/node_modules
echo "folder: ui-react"
npm run clean --prefix ui-react && rm -rf ui-react/node_modules
echo "folder: ui-angular"
npm run clean --prefix ui-angular && rm -rf ui-angular/node_modules
