#!/bin/bash
# Deploy reading test tracking files

set -e

echo "=== Deploying Reading Test Score Tracking ==="

# Deploy JS file
echo "Deploying readingScoreSaver.js..."
scp -o StrictHostKeyChecking=no Tests/practice/js/readingScoreSaver.js root@209.38.227.230:/var/www/ieltspractice/Tests/practice/js/

# Deploy dashboard
echo "Deploying dashboard.html..."
scp -o StrictHostKeyChecking=no dashboard.html root@209.38.227.230:/var/www/ieltspractice/

# Deploy reading tests - Part 1
echo "Deploying Reading Part 1..."
for f in Tests/practice/Reading/Reading-Part1/*.html; do
    if [ -f "$f" ]; then
        scp -o StrictHostKeyChecking=no "$f" "root@209.38.227.230:/var/www/ieltspractice/Tests/practice/Reading/Reading-Part1/"
    fi
done

# Deploy reading tests - Part 2
echo "Deploying Reading Part 2..."
for f in Tests/practice/Reading/Reading-Part2/*.html; do
    if [ -f "$f" ]; then
        scp -o StrictHostKeyChecking=no "$f" "root@209.38.227.230:/var/www/ieltspractice/Tests/practice/Reading/Reading-Part2/"
    fi
done

# Deploy reading tests - Part 3
echo "Deploying Reading Part 3..."
for f in Tests/practice/Reading/Reading-Part3/*.html; do
    if [ -f "$f" ]; then
        scp -o StrictHostKeyChecking=no "$f" "root@209.38.227.230:/var/www/ieltspractice/Tests/practice/Reading/Reading-Part3/"
    fi
done

# Deploy All Passages
echo "Deploying All Passages..."
for f in Tests/practice/Reading/All\ Passages/*.html; do
    if [ -f "$f" ]; then
        scp -o StrictHostKeyChecking=no "$f" "root@209.38.227.230:/var/www/ieltspractice/Tests/practice/Reading/All%20Passages/"
    fi
done

# Restart backend
echo "Restarting backend..."
ssh -o StrictHostKeyChecking=no root@209.38.227.230 'pm2 restart ielts-app && pm2 save'

echo "=== Deployment Complete ==="
