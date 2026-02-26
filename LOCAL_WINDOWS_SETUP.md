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
    First, ensure your Podman machine is running:
    ```powershell
    podman machine start
    ```
    Then, you can manually start the database using:
    ```powershell
    podman-compose up -d postgres
    ```
    *Note: The `podman-compose` step is automatically handled by VS Code when you start debugging (see below).*

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

### Telegram Channels Missing / Fetch History Not Working
If you added a new Telegram channel and hit **Fetch History**, but see nothing:
1. **Hidden Channels:** By default, channels with only "PENDING" (unresolved) signals might be grouped subtly. We have now updated the "Signals" tab UI so it explicitly lists Pending signals. Ensure the "Pending" filter is selected if you want to see them.
2. **Server Restart Required:** If the backend API routes were recently modified (e.g. adding the `fetch-history` endpoint), you MUST restart the Node.js server (`npm run dev`), otherwise the backend will return a 404 HTML page instead of executing the Python command.
3. **Unicode/Emoji Crashes in Windows Terminal:** Windows terminals sometimes crash when Python tries to print emojis (like ✅ or 🚀). This is solved by placing `sys.stdout.reconfigure(encoding='utf-8')` in the python scripts. If a python script abruptly stops in the background, check the `.vscode` debug console for `UnicodeEncodeError`.
4. **Regex Float Parsing:** If a channel uses trailing ellipses inside their SL/TP fields (e.g. `SL 5090...`), the signal parser might crash. We have patched this in `fetch_history.py` and `telegram_listener.py` to strip out explicit valid floats using strict regex boundaries (`[0-9]+(?:\.[0-9]+)?`).
