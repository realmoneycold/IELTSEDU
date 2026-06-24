#!/bin/bash
# Fix server script - Run this on the server via SSH

echo "=== Server Status Check ==="
echo "Date: $(date)"
echo ""

echo "=== Checking Nginx ==="
systemctl status nginx --no-pager

echo ""
echo "=== Checking Node.js/PM2 ==="
pm2 status

echo ""
echo "=== Starting Nginx if stopped ==="
systemctl start nginx
systemctl enable nginx

echo ""
echo "=== Restarting PM2 processes ==="
pm2 restart all

echo ""
echo "=== Checking ports ==="
netstat -tlnp | grep -E ':(80|443|3000|5000)' || ss -tlnp | grep -E ':(80|443|3000|5000)'

echo ""
echo "=== Nginx config test ==="
nginx -t

echo ""
echo "=== Done ==="
