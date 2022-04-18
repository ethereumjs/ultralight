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
        h|?) usage ;;
    esac
done

counter=1
while [ $counter -le $NODES ]
do
  port=$((8545+$counter))
  udp=$((5500 + $counter))
  metrics=$((18545 + $counter))
  node dist/index.js --rpc=true --rpcPort=$port --metrics=true --metricsPort=$metrics --bindAddress=127.0.0.1:$udp &
  counter=$(($counter+1))
done

sleep infinity

trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT