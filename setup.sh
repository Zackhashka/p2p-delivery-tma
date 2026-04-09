#!/bin/bash"set -e
echo "Initializing P2P Delivery Project..."
if [ ! -f .env ]; then # cp .env.example .env
fi
cd src/backend
npm install
cd ../..
cd src/frontend
npm install
cd ../..
cd src/bot
npm install
cd ../..
