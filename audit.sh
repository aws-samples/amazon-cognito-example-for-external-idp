#!/usr/bin/env bash

set -e
source ./env.sh

echo "this will perform npm audit --production on all packages"

echo "folder: lambda/api"
npm audit --production --prefix lambda/api
echo "folder: lambda/pretokengeneration"
npm audit --production --prefix lambda/pretokengeneration
echo "folder: cdk"
npm audit --production --prefix cdk
echo "folder: ui-react"
npm audit --production --prefix ui-react
echo "folder: ui-angular"
npm audit --production --prefix ui-angular

