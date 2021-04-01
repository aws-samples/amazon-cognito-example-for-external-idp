#!/usr/bin/env bash

set -e
source ./env.sh

echo "this will perform npm audit --fix on all packages"

echo "folder: lambda/api"
npm audit fix --prefix lambda/api
echo "folder: lambda/pretokengeneration"
npm audit fix --prefix lambda/pretokengeneration
echo "folder: cdk"
npm audit fix --prefix cdk
echo "folder: ui-react"
npm audit fix --prefix ui-react
echo "folder: ui-angular"
npm audit fix --prefix ui-angular

