#!/bin/bash
rm -rf ./lib
mkdir -p ./lib
cp ../api/DHTClient.js ./lib/
cp ../api/DHTUtils.js ./lib/
cp ../kvaluestore/ClientKV.js ./lib/
cp ../kwordstore/ClientKW.js ./lib/
