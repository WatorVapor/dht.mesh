#!/bin/bash
SCRIPT_DIR=$(cd $(dirname $0); pwd)
echo "SCRIPT_DIR:=${SCRIPT_DIR}"
docker run -it\
  -v /etc/group:/etc/group:ro\
  -v /etc/passwd:/etc/passwd:ro\
  -v ${SCRIPT_DIR}:${SCRIPT_DIR}\
  -u $(id -u $USER):$(id -g $USER)\
  -w ${SCRIPT_DIR}\
  -e TZ=Asia/Tokyo \
  node:lts /bin/bash
