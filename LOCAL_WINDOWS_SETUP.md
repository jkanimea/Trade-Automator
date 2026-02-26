# Local Environment Setup (Windows + Podman + VS Code)

This guide is specifically tailored for the local environment configuration using Windows, Podman, and VS Code.

## Prerequisites

1.  **Node.js**: v20 or later.
2.  **Python**: 3.11 or later.
3.  **Podman**: Installed and running (replaces Docker).
4.  **VS Code**: With the "Python Debugger" (`ms-python.debugpy`) extension installed.

## Step 1: Initialize the Environment

1.  **Clone the Repository**:
    ```powershell
    git clone https://github.com/jkanimea/Trade-Automator.git
    cd Trade-Automator
    git checkout local-setup-fix
    ```

2.  **Install Node.js Dependencies**:
    ```powershell
    npm install
    ```

3.  **Install Python Dependencies**:
    ```powershell
    cd python
    pip install -r requirements.txt
    pip install debugpy  # Required for VS Code debugging
    cd ..
    ```

## Step 2: Database Configuration (Podman)

The system is configured to use Port **5434** for the local PostgreSQL database to avoid conflicts with other local Postgres instances.

1.  **Start the Database**:
    You can manually start it using:
    ```powershell
    podman-compose up -d postgres
    ```
    *Note: This is automatically handled by VS Code when you start debugging (see below).*

2.  **Initialize the Schema**:
    ```powershell
    npm run db:push
    ```

## Step 3: Environment Variables

Create or update your `.env` file in the root directory:

```env
DATABASE_URL=postgresql://jkani:QTPvz766%40@127.0.0.1:5434/trade_automator
TELEGRAM_BOT_TOKEN=your_token
CTRADER_CLIENT_ID=your_id
CTRADER_CLIENT_SECRET=your_secret
CTRADER_ACCOUNT_ID=your_account
PORT=5000
NODE_ENV=development
```

## Step 4: VS Code Automation

We have automated the database startup and debugging process.

### Automated Tasks
The `.vscode/tasks.json` file contains a "Start Database" task that ensures Podman is running before the debugger attaches.

### Running & Debugging
1.  Open the **Run and Debug** view in VS Code (`Ctrl+Shift+D`).
2.  Select one of the following:
    *   **Web App (Debug)**: Starts the backend and frontend.
    *   **Telegram Listener (Debug)**: Starts the signal listener.
    *   **Price Verification (Debug)**: Starts the verification script.
3.  Press **F5**.
    *   **Automation**: VS Code will automatically start the Postgres container in Podman before launching the selected script.

## Troubleshooting

### "Could not find debugpy path"
If you get this error in VS Code:
1.  Ensure you ran `pip install debugpy`.
2.  Verify the **Python Debugger** extension is installed in VS Code.

### Database Connection Failure
1.  Ensure Podman Desktop is running.
2.  Check if the port is open: `netstat -ano | findstr 5434`.
3.  Verify the `DATABASE_URL` in `.env` uses port `5434`.

### 500 Internal Server Error
This usually indicates the backend cannot reach the database. Check the **System Logs** page in the dashboard or the VS Code debug console for specific error messages.
