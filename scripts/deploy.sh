#!/bin/bash
set -e

# =============================================
# Focus Racer — Deploy to Oracle Cloud
# =============================================
# Usage:
#   1. SSH into your Oracle instance
#   2. Clone the repo
#   3. Copy .env.example to .env and fill in values
#   4. Run: chmod +x scripts/deploy.sh && ./scripts/deploy.sh
# =============================================

echo "=== Focus Racer — Deployment ==="

# Check .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found. Copy .env.example to .env and fill in your values."
    exit 1
fi

# Build and start services
echo "[1/3] Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo "[2/3] Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo "[3/3] Waiting for app to be healthy..."
sleep 10

# Check if app is running
if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200"; then
    echo ""
    echo "=== Deployment successful! ==="
    echo "App running at http://$(hostname -I | awk '{print $1}')"
    echo ""
    echo "Next steps:"
    echo "  1. Point your domain DNS to this server IP"
    echo "  2. Setup HTTPS: docker run --rm -v focusracer_certbot-etc:/etc/letsencrypt -v focusracer_certbot-var:/var/lib/letsencrypt certbot/certbot certonly --webroot -w /var/lib/letsencrypt -d yourdomain.com"
    echo "  3. Uncomment HTTPS block in nginx.conf and restart nginx"
    echo ""
    echo "Seed test data:"
    echo "  docker compose -f docker-compose.prod.yml exec app npx prisma db seed"
    echo ""
    echo "View logs:"
    echo "  docker compose -f docker-compose.prod.yml logs -f app"
else
    echo "WARNING: App may not be ready yet. Check logs:"
    echo "  docker compose -f docker-compose.prod.yml logs app"
fi
