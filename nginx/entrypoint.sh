#!/bin/bash

# Check if the SSL certificate exists
if [ ! -f /etc/letsencrypt/live/api.wyecare.com/fullchain.pem ]; then
    echo "SSL certificate not found, obtaining one..."
    certbot certonly --standalone --noninteractive --agree-tos --email anandhusathe@gmail.com -d api.wyecare.com
else
    echo "SSL certificate found, starting Nginx..."
fi

# Start Nginx
exec "$@"