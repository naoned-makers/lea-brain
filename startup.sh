#!/bin/sh

# Start my node project
cd ~/dev/lea/leaspeaking && npm run prod
# Print the IP address
#_IP=$(hostname -I) || true
#if [ "$_IP" ]; then
#    printf "My IP address is %s\n" "$_IP"
#fi
