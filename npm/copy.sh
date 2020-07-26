#!/bin/bash
rm -rf ./lib
mkdir -p ./lib
mkdir -p ./lib/api
cp ../api/DHTClient.js ./lib/api/
cp ../api/DHTUtils.js ./lib/api/
mkdir -p ./lib/kvaluestore
cp ../kvaluestore/ClientKV.js ./lib/kvaluestore/
mkdir -p ./lib/kwordstore
cp ../kwordstore/ClientKW.js ./lib/kwordstore/
