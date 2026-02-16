#!/bin/bash
set -e

echo "🚀 Focus Racer - Deployment Script"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root (sudo ./deploy-server.sh)${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Step 1/7: Installing prerequisites...${NC}"
apt update
apt install -y curl git apt-transport-https ca-certificates software-properties-common

echo -e "${BLUE}🐳 Step 2/7: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${YELLOW}⏭️  Docker already installed${NC}"
fi

echo -e "${BLUE}🐳 Step 3/7: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${YELLOW}⏭️  Docker Compose already installed${NC}"
fi

echo -e "${BLUE}📂 Step 4/7: Setting up project directory...${NC}"
PROJECT_DIR="/opt/focusracer"
if [ ! -d "$PROJECT_DIR" ]; then
    mkdir -p $PROJECT_DIR
    cd $PROJECT_DIR

    echo -e "${BLUE}📥 Cloning repository...${NC}"
    git clone https://github.com/Pixoupix/focus-racer.git .
    echo -e "${GREEN}✅ Repository cloned${NC}"
else
    cd $PROJECT_DIR
    echo -e "${BLUE}🔄 Updating repository...${NC}"
    git pull origin master
    echo -e "${GREEN}✅ Repository updated${NC}"
fi

echo -e "${BLUE}⚙️  Step 5/7: Creating .env file...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.production.template" ]; then
        cp .env.production.template .env
        echo -e "${YELLOW}⚠️  .env created from template - YOU MUST EDIT IT!${NC}"
        echo -e "${YELLOW}   Run: nano /opt/focusracer/.env${NC}"
    else
        echo -e "${RED}❌ .env.production.template not found!${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⏭️  .env already exists${NC}"
fi

echo -e "${BLUE}📁 Step 6/7: Creating upload directory...${NC}"
mkdir -p ./public/uploads
chmod -R 755 ./public/uploads
echo -e "${GREEN}✅ Upload directory created${NC}"

echo -e "${BLUE}🐳 Step 7/7: Building and starting containers...${NC}"
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "1. Edit environment variables:"
echo -e "   ${YELLOW}nano /opt/focusracer/.env${NC}"
echo -e ""
echo -e "2. Restart services:"
echo -e "   ${YELLOW}cd /opt/focusracer${NC}"
echo -e "   ${YELLOW}docker-compose -f docker-compose.production.yml restart${NC}"
echo -e ""
echo -e "3. View logs:"
echo -e "   ${YELLOW}docker-compose -f docker-compose.production.yml logs -f${NC}"
echo -e ""
echo -e "4. Run database migrations:"
echo -e "   ${YELLOW}docker-compose -f docker-compose.production.yml exec app npx prisma migrate deploy${NC}"
echo -e ""
echo -e "5. Seed database (optional):"
echo -e "   ${YELLOW}docker-compose -f docker-compose.production.yml exec app npm run seed${NC}"
echo -e ""
echo -e "${BLUE}🌐 Your app should be available at:${NC}"
echo -e "   ${GREEN}https://focusracer.swipego.app${NC}"
echo -e ""
echo -e "${YELLOW}⚠️  Remember to configure your .env file before accessing!${NC}"
