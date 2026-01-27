#!/bin/bash

###############################################################################
# 🚀 Rocket Launch Tracker - AWS Lightsail Deployment Setup
###############################################################################
#
# This script automates the complete deployment of the Rocket Launch Tracker
# to an AWS Lightsail Ubuntu 24.04 LTS instance.
#
# What this script does:
# 1. Installs Bun runtime (primary runtime for backend)
# 2. Installs Node.js + PM2 (process manager)
# 3. Installs Nginx (reverse proxy + static file server)
# 4. Installs Certbot (SSL certificates)
# 5. Clones/updates repository
# 6. Installs dependencies with Bun
# 7. Initializes database
# 8. Builds frontend
# 9. Configures Nginx
# 10. Starts backend with PM2
# 11. Sets up daily sync cron job
# 12. Configures firewall (UFW)
#
# Prerequisites:
# - Fresh Ubuntu 24.04 LTS instance
# - SSH access
# - Git repository accessible
# - Domain name (optional, for SSL)
#
# Usage:
#   sudo ./deploy/setup.sh
#
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

###############################################################################
# Configuration Variables
###############################################################################

# Repository configuration
REPO_URL="https://github.com/davek42/rocket-launch-tracker.git"
DEPLOY_USER="ubuntu"
DEPLOY_DIR="/var/www/rocket-launches"

# Application configuration
APP_NAME="rocket-launches-api"
BACKEND_PORT=3005
#TODO
DOMAIN="yourdomain.com"  # UPDATE THIS for SSL!

# Paths
BUN_INSTALL_DIR="/home/$DEPLOY_USER/.bun"
BUN_BIN="$BUN_INSTALL_DIR/bin/bun"
LOG_DIR="/var/log/rocket-launches"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

###############################################################################
# Installation Functions
###############################################################################

install_system_dependencies() {
    log_info "Updating system packages..."
    apt-get update -y
    apt-get upgrade -y

    log_info "Installing system dependencies..."
    apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        unzip \
        software-properties-common \
        ufw \
        certbot \
        python3-certbot-nginx

    log_success "System dependencies installed"
}

install_bun() {
    log_info "Installing Bun runtime..."

    # Install Bun for the deploy user
    if [ ! -f "$BUN_BIN" ]; then
        su - $DEPLOY_USER -c "curl -fsSL https://bun.sh/install | bash"
        log_success "Bun installed at $BUN_BIN"
    else
        log_info "Bun already installed, skipping..."
    fi

    # Verify installation
    if su - $DEPLOY_USER -c "$BUN_BIN --version" > /dev/null 2>&1; then
        local bun_version=$(su - $DEPLOY_USER -c "$BUN_BIN --version")
        log_success "Bun version: $bun_version"
    else
        log_error "Bun installation failed"
        exit 1
    fi
}

install_nodejs_and_pm2() {
    log_info "Installing Node.js for PM2..."

    # Install Node.js 20.x LTS
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
        log_success "Node.js installed: $(node --version)"
    else
        log_info "Node.js already installed: $(node --version)"
    fi

    # Install PM2 globally
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
        log_success "PM2 installed: $(pm2 --version)"
    else
        log_info "PM2 already installed: $(pm2 --version)"
    fi

    # Setup PM2 startup script
    env PATH=$PATH:/usr/bin pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER
    log_success "PM2 startup script configured"
}

install_nginx() {
    log_info "Installing Nginx..."

    if ! command -v nginx &> /dev/null; then
        apt-get install -y nginx
        log_success "Nginx installed: $(nginx -v 2>&1)"
    else
        log_info "Nginx already installed: $(nginx -v 2>&1)"
    fi

    # Enable Nginx to start on boot
    systemctl enable nginx
    log_success "Nginx enabled for startup"
}

###############################################################################
# Application Setup Functions
###############################################################################

setup_application_directory() {
    log_info "Setting up application directory..."

    # Create deploy directory if it doesn't exist
    if [ ! -d "$DEPLOY_DIR" ]; then
        mkdir -p "$DEPLOY_DIR"
        log_success "Created directory: $DEPLOY_DIR"
    fi

    # Create log directory
    if [ ! -d "$LOG_DIR" ]; then
        mkdir -p "$LOG_DIR"
        chown -R $DEPLOY_USER:$DEPLOY_USER "$LOG_DIR"
        log_success "Created log directory: $LOG_DIR"
    fi

    # Clone or update repository
    if [ ! -d "$DEPLOY_DIR/.git" ]; then
        log_info "Cloning repository..."
        su - $DEPLOY_USER -c "git clone $REPO_URL $DEPLOY_DIR"
        log_success "Repository cloned"
    else
        log_info "Updating repository..."
        su - $DEPLOY_USER -c "cd $DEPLOY_DIR && git pull origin main"
        log_success "Repository updated"
    fi

    # Set ownership
    chown -R $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_DIR"
    log_success "Directory ownership set to $DEPLOY_USER"
}

install_backend_dependencies() {
    log_info "Installing backend dependencies..."

    cd "$DEPLOY_DIR/backend"
    su - $DEPLOY_USER -c "cd $DEPLOY_DIR/backend && $BUN_BIN install"

    log_success "Backend dependencies installed"
}

install_frontend_dependencies() {
    log_info "Installing frontend dependencies..."

    cd "$DEPLOY_DIR/frontend"
    su - $DEPLOY_USER -c "cd $DEPLOY_DIR/frontend && $BUN_BIN install"

    log_success "Frontend dependencies installed"
}

setup_database() {
    log_info "Setting up database..."

    # Create data directory
    mkdir -p "$DEPLOY_DIR/backend/data"
    chown -R $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_DIR/backend/data"

    # Run database setup script
    cd "$DEPLOY_DIR/backend"
    su - $DEPLOY_USER -c "cd $DEPLOY_DIR/backend && $BUN_BIN run setup-db"

    log_success "Database initialized"
    log_warning "Run 'bun run initial-load' to load launch data (requires API key in .env)"
}

create_production_env() {
    log_info "Creating production .env file..."

    local env_file="$DEPLOY_DIR/backend/.env"

    # Create .env if it doesn't exist
    if [ ! -f "$env_file" ]; then
        cat > "$env_file" << EOF
# Server
NODE_ENV=production
PORT=$BACKEND_PORT

# Database (absolute path for PM2)
DB_PATH=$DEPLOY_DIR/backend/data/launches.db

# Launch Library 2 API
LL2_API_BASE_URL=https://ll.thespacedevs.com/2.2.0
LL2_API_KEY=YOUR_API_KEY_HERE

# Sync settings
SYNC_DELAY_MS=300000
SYNC_LOOKBACK_HOURS=48

# Logging
LOG_LEVEL=info
EOF
        chown $DEPLOY_USER:$DEPLOY_USER "$env_file"
        chmod 600 "$env_file"

        log_success "Production .env created"
        log_warning "IMPORTANT: Update LL2_API_KEY in $env_file"
    else
        log_info ".env file already exists, skipping..."
    fi
}

build_frontend() {
    log_info "Building frontend for production..."

    cd "$DEPLOY_DIR/frontend"
    su - $DEPLOY_USER -c "cd $DEPLOY_DIR/frontend && $BUN_BIN run build"

    log_success "Frontend built successfully"
}

###############################################################################
# Nginx Configuration
###############################################################################

configure_nginx() {
    log_info "Configuring Nginx..."

    # Copy nginx config
    local nginx_config="/etc/nginx/sites-available/rocket-launches"
    cp "$DEPLOY_DIR/deploy/nginx.conf" "$nginx_config"

    # Update config with actual domain if provided
    if [ "$DOMAIN" != "yourdomain.com" ]; then
        sed -i "s/yourdomain.com/$DOMAIN/g" "$nginx_config"
    fi

    # Create symlink to sites-enabled
    ln -sf "$nginx_config" /etc/nginx/sites-enabled/rocket-launches

    # Remove default site if it exists
    if [ -f /etc/nginx/sites-enabled/default ]; then
        rm /etc/nginx/sites-enabled/default
        log_info "Removed default Nginx site"
    fi

    # Test nginx configuration
    if nginx -t; then
        log_success "Nginx configuration valid"
    else
        log_error "Nginx configuration invalid"
        exit 1
    fi

    # Reload nginx
    systemctl reload nginx
    log_success "Nginx configured and reloaded"
}

###############################################################################
# PM2 Configuration
###############################################################################

configure_pm2() {
    log_info "Configuring PM2..."

    # Stop existing PM2 processes if any
    su - $DEPLOY_USER -c "pm2 delete $APP_NAME || true"

    # Start application with PM2 using ecosystem config
    cd "$DEPLOY_DIR/backend"
    su - $DEPLOY_USER -c "cd $DEPLOY_DIR && pm2 start deploy/ecosystem.config.js"

    # Save PM2 process list
    su - $DEPLOY_USER -c "pm2 save"

    log_success "PM2 configured and application started"

    # Show status
    su - $DEPLOY_USER -c "pm2 status"
}

###############################################################################
# Cron Job Setup
###############################################################################

setup_cron_job() {
    log_info "Setting up daily sync cron job..."

    # Create cron job for daily sync at 4 AM UTC
    local cron_cmd="0 4 * * * cd $DEPLOY_DIR/backend && $BUN_BIN run daily-sync >> $LOG_DIR/sync.log 2>&1"

    # Add to user's crontab
    (su - $DEPLOY_USER -c "crontab -l 2>/dev/null" || true; echo "$cron_cmd") | \
        su - $DEPLOY_USER -c "crontab -"

    log_success "Daily sync cron job configured (runs at 4 AM UTC)"

    # Show crontab
    log_info "Current crontab:"
    su - $DEPLOY_USER -c "crontab -l | grep daily-sync"
}

###############################################################################
# Firewall Configuration
###############################################################################

configure_firewall() {
    log_info "Configuring firewall (UFW)..."

    # Reset UFW to default
    ufw --force reset

    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH
    ufw allow ssh
    ufw allow 22/tcp

    # Allow HTTP and HTTPS
    ufw allow 'Nginx Full'
    ufw allow 80/tcp
    ufw allow 443/tcp

    # Enable UFW
    ufw --force enable

    log_success "Firewall configured"
    log_info "Firewall status:"
    ufw status
}

###############################################################################
# SSL Certificate Setup (Optional)
###############################################################################

setup_ssl_instructions() {
    log_info "SSL Certificate Setup Instructions:"
    echo ""
    echo "To enable HTTPS with Let's Encrypt:"
    echo "1. Ensure your domain DNS A record points to this server's IP"
    echo "2. Run: sudo certbot --nginx -d $DOMAIN"
    echo "3. Follow the prompts to complete SSL setup"
    echo "4. Certbot will automatically configure Nginx and set up auto-renewal"
    echo ""
    log_warning "SSL setup skipped - run certbot manually when DNS is configured"
}

###############################################################################
# Verification Functions
###############################################################################

verify_installation() {
    log_info "Verifying installation..."

    local all_good=true

    # Check Bun
    if su - $DEPLOY_USER -c "$BUN_BIN --version" > /dev/null 2>&1; then
        log_success "Bun: OK"
    else
        log_error "Bun: FAILED"
        all_good=false
    fi

    # Check PM2
    if command -v pm2 &> /dev/null; then
        log_success "PM2: OK"
    else
        log_error "PM2: FAILED"
        all_good=false
    fi

    # Check Nginx
    if systemctl is-active --quiet nginx; then
        log_success "Nginx: OK (running)"
    else
        log_error "Nginx: FAILED (not running)"
        all_good=false
    fi

    # Check database
    if [ -f "$DEPLOY_DIR/backend/data/launches.db" ]; then
        log_success "Database: OK"
    else
        log_error "Database: FAILED (file not found)"
        all_good=false
    fi

    # Check backend process
    if su - $DEPLOY_USER -c "pm2 status" | grep -q "$APP_NAME.*online"; then
        log_success "Backend: OK (running)"
    else
        log_error "Backend: FAILED (not running)"
        all_good=false
    fi

    # Check frontend build
    if [ -d "$DEPLOY_DIR/frontend/dist" ]; then
        log_success "Frontend: OK (built)"
    else
        log_error "Frontend: FAILED (not built)"
        all_good=false
    fi

    # Check backend health endpoint
    sleep 2  # Give backend time to start
    if curl -f http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        log_success "Backend health check: OK"
    else
        log_warning "Backend health check: FAILED (may need more time to start)"
    fi

    # Check Nginx proxy
    if curl -f http://localhost/api/health > /dev/null 2>&1; then
        log_success "Nginx proxy: OK"
    else
        log_warning "Nginx proxy: FAILED (check Nginx config)"
    fi

    if [ "$all_good" = true ]; then
        log_success "All checks passed!"
    else
        log_warning "Some checks failed - review errors above"
    fi
}

###############################################################################
# Post-Installation Instructions
###############################################################################

show_next_steps() {
    echo ""
    echo "=============================================================================="
    log_success "🚀 Rocket Launch Tracker deployment complete!"
    echo "=============================================================================="
    echo ""
    echo "📋 Next Steps:"
    echo ""
    echo "1. Update API Key:"
    echo "   sudo nano $DEPLOY_DIR/backend/.env"
    echo "   (Set LL2_API_KEY to your Launch Library 2 API key)"
    echo ""
    echo "2. Load initial data (~7,000+ launches):"
    echo "   cd $DEPLOY_DIR/backend"
    echo "   $BUN_BIN run initial-load"
    echo "   (This may take 10-15 minutes due to API rate limits)"
    echo ""
    echo "3. Configure DNS:"
    echo "   Point your domain's A record to this server's IP address"
    echo ""
    echo "4. Setup SSL certificate:"
    echo "   sudo certbot --nginx -d $DOMAIN"
    echo ""
    echo "5. Monitor logs:"
    echo "   pm2 logs $APP_NAME              # Backend logs"
    echo "   tail -f $LOG_DIR/sync.log       # Sync logs"
    echo "   tail -f /var/log/nginx/error.log # Nginx logs"
    echo ""
    echo "=============================================================================="
    echo "📊 Useful Commands:"
    echo "=============================================================================="
    echo ""
    echo "PM2 Management:"
    echo "  pm2 status                   # Show process status"
    echo "  pm2 logs $APP_NAME          # View logs"
    echo "  pm2 restart $APP_NAME       # Restart backend"
    echo "  pm2 stop $APP_NAME          # Stop backend"
    echo ""
    echo "Application:"
    echo "  cd $DEPLOY_DIR/backend && $BUN_BIN run daily-sync  # Manual sync"
    echo "  cd $DEPLOY_DIR && git pull origin main              # Update code"
    echo ""
    echo "Nginx:"
    echo "  sudo systemctl status nginx  # Check status"
    echo "  sudo systemctl reload nginx  # Reload config"
    echo "  sudo nginx -t                # Test config"
    echo ""
    echo "Firewall:"
    echo "  sudo ufw status              # Show firewall rules"
    echo ""
    echo "=============================================================================="
    echo "🔗 Application URLs:"
    echo "=============================================================================="
    echo ""
    echo "  Frontend:  http://$(curl -s ifconfig.me)/"
    echo "  API:       http://$(curl -s ifconfig.me)/api/launches"
    echo ""
    if [ "$DOMAIN" != "yourdomain.com" ]; then
        echo "  Domain:    http://$DOMAIN/ (after DNS configuration)"
        echo "  HTTPS:     https://$DOMAIN/ (after SSL setup)"
    else
        echo "Skip domain setup"
    fi
    echo ""
    echo "=============================================================================="
}

###############################################################################
# Main Execution
###############################################################################

main() {
    log_info "Starting Rocket Launch Tracker deployment..."
    echo ""

    # Pre-flight checks
    check_root

    # Installation steps
    install_system_dependencies
    install_bun
    install_nodejs_and_pm2
    install_nginx

    # Application setup
    setup_application_directory
    install_backend_dependencies
    install_frontend_dependencies
    create_production_env
    setup_database
    build_frontend

    # Server configuration
    configure_nginx
    configure_pm2
    setup_cron_job
    configure_firewall

    # Post-installation
    verify_installation
    setup_ssl_instructions
    show_next_steps

    log_success "Deployment completed successfully! 🎉"
}

# Run main function
main "$@"
