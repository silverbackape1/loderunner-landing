#!/bin/sh
set -e
cd "$(dirname "$0")"
HOST=root@179.253.162.78
SSH="ssh -i $HOME/.ssh/id_ed25519_infra -o IdentitiesOnly=yes"
rsync -az --delete -e "$SSH" --exclude '.*' --exclude 'deploy.sh' ./ "$HOST:/var/www/loderunner/"
$SSH "$HOST" 'chown -R www-data:www-data /var/www/loderunner'
echo "deployed: http://179.253.162.78/"
