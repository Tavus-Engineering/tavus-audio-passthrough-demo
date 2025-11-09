# Launcher Script

The launcher script (`launcher.js`) orchestrates the entire Tavus Audio Passthrough system.

## What It Does

1. **Starts the Python Bot**
   - Launches `main.py`
   - Monitors stdout/stderr for the Tavus conversation URL
   - Automatically extracts and saves the URL

2. **Starts the React Frontend**
   - Launches the Vite dev server on `http://localhost:3000`
   - Automatically passes the conversation URL to the frontend
   - Frontend auto-joins the Tavus room

3. **Monitors Connections**
   - Watches for bot disconnections
   - Automatically restarts everything if connection drops
   - Creates a new Tavus conversation on restart

4. **Unified Logging**
   - Color-coded output for bot and frontend
   - Easy to see what's happening in each service

## Usage

### Quick Start

```bash
npm start
```

That's it! The launcher will:
- Start the Python bot
- Wait for the Tavus conversation URL
- Start the React frontend
- Auto-connect the frontend to the Tavus room

### Requirements

Before running, make sure:
1. Python dependencies are installed: `pip install -r requirements.txt`
2. Frontend dependencies are installed: `cd frontend && npm install`
3. `.env` file is configured with your credentials

### What to Expect

You'll see output like this:

```
╔══════════════════════════════════════════════════════════════╗
║          Tavus Audio Passthrough Launcher                    ║
╚══════════════════════════════════════════════════════════════╝

[Python Bot] Starting...
[Bot] Pipecat 0.0.93...
[Bot] Creating Tavus conversation...
[Bot] Created Tavus conversation: {'conversation_url': 'https://tavus.daily.co/xxxxx', ...}

================================================================================
✓ Tavus Conversation URL: https://tavus.daily.co/xxxxx
✓ React frontend will auto-connect
================================================================================

[React Frontend] Starting on http://localhost:3000...
[Frontend] VITE v5.4.2 ready...
[Frontend] Local: http://localhost:3000

[Frontend] Ready! Open http://localhost:3000 in your browser

✓ All services started successfully!
✓ Bot is capturing audio from Daily room
✓ Frontend is displaying the Tavus replica

Press Ctrl+C to stop all services.
```

### Workflow

1. Run `npm start`
2. Open `http://localhost:3000` (or it may open automatically)
3. Frontend auto-connects to the Tavus replica
4. Join your Daily room (from `.env`) to provide audio input
5. Speak and watch the replica animate in the browser

### Auto-Restart

If the bot disconnects or crashes:
- Launcher detects the disconnection
- Waits 3 seconds
- Restarts both bot and frontend
- Creates a new Tavus conversation
- Frontend auto-connects to the new room

### Stopping

Press `Ctrl+C` to gracefully shut down both services.

## Configuration

You can modify these values in `launcher.js`:

```javascript
const RESTART_DELAY = 3000; // Time to wait before restart (ms)
```

## Troubleshooting

**"Python bot won't start"**
- Make sure Python is in your PATH
- Verify requirements are installed: `pip install -r requirements.txt`
- Check that `.env` file exists and is configured

**"Frontend won't start"**
- Make sure you've run `cd frontend && npm install`
- Check that port 3000 is available

**"URL not being detected"**
- The launcher looks for `'conversation_url': 'https://...'` in logs
- Make sure your Python logging is set to DEBUG level
- Check the bot is successfully creating Tavus conversations

**"Auto-connect not working"**
- Check that `frontend/src/conversation-url.json` is being created
- Verify the frontend can read this file
- Check browser console for errors

## Manual Mode

You can still run each component separately:

```bash
# Terminal 1: Python bot
python main.py

# Terminal 2: Frontend
cd frontend
npm run dev
```

Then manually paste the conversation URL into the frontend.
