#!/bin/bash
set -a
source .env
set +a
NODE_ENV=production node dist/index.js