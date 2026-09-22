#!/usr/bin/env bash
set -euo pipefail # stop at the first failure

HOST=ec2-user@3.12.144.166
KEY=~/.ssh/quotio.pem
npm run build # on your laptop. 1 GB cannot do this.

rsync -avz --delete \
--exclude '.git' --exclude 'node_modules' --exclude '.env' --exclude 'src/rag_ai_service/venv' --exclude 'src/rag_ai_service/__pycache__cd' \
-e "ssh -i $KEY" ./ "$HOST":/var/www/app/

ssh -i "$KEY" "$HOST" \
'cd /var/www/app && npm ci --omit=dev && sudo systemctl restart capstone && sudo systemctl restart rag-api'
echo "deployed"