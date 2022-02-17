#!/bin/sh
set -e

node packages/proxy/dist/index.js --nat=localhost &
sleep 3
counter=1
while [ $counter -le $1 ]
do
  port=$((8545+$counter))
  node packages/cli/dist/index.js --nat=localhost --proxy=false --rpc --rpcport=$port &
  counter=$(($counter+1))
done

sleep infinity

trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT