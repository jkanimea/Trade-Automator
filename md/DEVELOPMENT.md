# Development Environment Configuration

## Prerequisites
- Node.js 18+ 
- Python 3.8+
- Docker and Docker Compose
- PostgreSQL client tools

## Environment Variables

Create `.env.local` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/trade_automator

# Telegram Configuration
TELEGRAM_API_ID=YOUR_TELEGRAM_API_ID
TELEGRAM_API_HASH=YOUR_TEGRAM_API_HASH
TELEGRAM_PHONE=YOUR_PHONE_NUMBER

# cTrader Configuration
CTRADER_CLIENT_ID=YOUR_CTRADER_CLIENT_ID
CTRADER_CLIENT_SECRET=YOUR_CTRADER_CLIENT_SECRET
CTRADER_ACCOUNT_ID=YOUR_CTRADER_ACCOUNT_ID

# Price Verification
TWELVE_DATA_API_KEY=YOUR_TWELVE_DATA_API_KEY

# Application
NODE_ENV=development
PORT=5000
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Python dependencies
cd python
pip install -r requirements.txt
cd ..
```

### 2. Start Database

```bash
docker-compose up -d postgres
```

### 3. Run Database Migrations

```bash
npm run db:push
```

### 4. Start Development Services

```bash
# Start Node.js backend
npm run dev

# Start Python services (in separate terminal)
cd python
python telegram_listener.py
python verify_signals.py
cd ..

# Start Frontend (in separate terminal)
npm run dev:client
```

### 5. Verify Setup

- Backend: http://localhost:5000/api/status
- Frontend: http://localhost:5000
- Database: localhost:5432

## Development Scripts

```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "dev:client": "vite dev --port 5000",
    "build": "tsx script/build.ts",
    "start": "NODE_ENV=production node dist/index.cjs",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  }
}
```

## Python Service Configuration

### Telegram Listener
- Monitors configured channels for trading signals
- Parses signals using regex patterns
- Forwards to Node.js API

### Signal Verification
- Uses Twelve Data API for price verification
- Implements rate limiting and retry logic
- Updates signal outcomes in database

### cTrader Client
- OAuth2 authentication for trade execution
- Order placement and position management

## Environment Variables Reference

### Database
- `DATABASE_URL`: PostgreSQL connection string

### Telegram
- `TELEGRAM_API_ID`: API ID from my.telegram.org
- `TELEGRAM_API_HASH`: API Hash from my.telegram.org
- `TELEGRAM_PHONE`: Phone number for Telegram authentication

### cTrader
- `CTRADER_CLIENT_ID`: OAuth2 client ID
- `CTRADER_CLIENT_SECRET`: OAuth2 client secret
- `CTRADER_ACCOUNT_ID`: Trading account ID

### Price Verification
- `TWELVE_DATA_API_KEY`: API key for market data

### Application
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 5000)

## Troubleshooting

### Common Issues
1. **Database connection errors**: Ensure PostgreSQL container is running
2. **Telegram authentication**: Verify API credentials and phone number
3. **cTrader API**: Check OAuth2 credentials and account permissions
4. **Price verification**: Ensure Twelve Data API key is valid

### Debug Commands
```bash
# Check Docker containers
docker ps

# View logs
docker logs <container_name>

# Database connection check
psql -h localhost -p 5432 -U user -d trade_automator
```

## Security Notes
- Never commit `.env.local` files to version control
- Use environment-specific configurations for different environments
- Store sensitive credentials securely using secret management tools