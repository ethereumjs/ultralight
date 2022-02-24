#!/bin/sh
set -e

usage() {
    echo 'Usage: ./devnet.sh [-n number of nodes] [-l percent packet loss]'
}

NODES=1
LOSS=0

while getopts "n:l::" c
do
    case $c in
        n) NODES=$OPTARG ;;
        l) LOSS=$OPTARG ;;
        h|?) usage ;;
    esac
done

node ../proxy/dist/index.js --nat=localhost --packetLoss=$LOSS &
sleep 3
counter=1
while [ $counter -le $NODES ]
do
  port=$((8545+$counter))
  metrics=$((18545 + $counter))
  node dist/index.js --nat=localhost --proxy=false --rpc --rpcPort=$port --metrics=true --metricsPort=$metrics &
  counter=$(($counter+1))
done

sleep infinity

trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT