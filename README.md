# Tavus Audio Passthrough

This project demonstrates how to pipe incoming audio directly to Tavus in Pipecat, bypassing the typical TTS pipeline. This is useful when you want to synchronize a user's voice directly with a Tavus video replica instead of using synthesized speech.

## Quick Reference

```bash
# Install everything
pip install -r requirements.txt
npm install
cd frontend && npm install && cd ..

# Configure .env with your credentials
cp .env.example .env

# Run everything
npm start

# Then:
# - Open http://localhost:3000 to view the replica
# - Join your Daily room to provide audio input
```

## Overview

The typical Pipecat pipeline with Tavus looks like:
```
Input → STT → LLM → TTS → Tavus → Output
```

This project simplifies it to:
```
Input → Tavus (video animation only)
```

### How It Works

1. You create a permanent Daily room for audio passthrough
2. The bot joins that room and captures incoming audio
3. The bot creates a Tavus conversation (which generates a separate conversation URL)
4. Incoming audio is converted and sent to TavusVideoService to animate the replica
5. Users join the Tavus conversation URL to see the animated video replica

## Features

- **Unified Launcher Script**: Single command to start everything (`npm start`)
- **Auto-Reconnection**: Automatically restarts and creates new rooms on disconnection
- Direct audio passthrough to Tavus replica
- No speech-to-text, LLM, or text-to-speech processing
- Real-time audio/video synchronization
- Two-room architecture: separate audio input room and video output conversation
- No audio echo in the passthrough room
- React-based fullscreen viewer with auto-connect
- Configurable sample rate (16kHz input, 24kHz to Tavus)

## Prerequisites

- Python 3.8+
- Node.js 18+ and npm
- A Daily.co account and permanent room URL for audio passthrough
- Tavus API key and replica ID

## Installation

### 1. Create a Daily room for audio passthrough

- Go to [daily.co](https://daily.co) and sign up/login
- Create a new room (this will be your permanent audio passthrough room)
- Copy the room URL (e.g., `https://your-domain.daily.co/your-room`)
- This is where you'll join to provide audio input

### 2. Clone this project

```bash
git clone <repo-url>
cd tavus-audio-passthrough
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

**Note:** You may want to use a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Install Node.js dependencies

Install dependencies for both the launcher and frontend:

```bash
# Install root dependencies (launcher)
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 5. Configure environment variables

Create your `.env` file:

```bash
cp .env.example .env
```

Then edit `.env` and add your credentials:

```env
# Daily.co Configuration
DAILY_ROOM_URL=https://your-domain.daily.co/your-room

# Tavus API Configuration
TAVUS_API_KEY=your_tavus_api_key_here
TAVUS_REPLICA_ID=your_replica_id_here
```

Replace:
- `DAILY_ROOM_URL`: Your Daily room URL from step 1
- `TAVUS_API_KEY`: Your Tavus API key from [Tavus Dashboard](https://tavus.io)
- `TAVUS_REPLICA_ID`: Your Tavus replica ID

---

**Installation complete!** Now proceed to Quick Start below to run the system.

---

## Quick Start (Recommended)

Once installation is complete, start everything with one command:

```bash
npm start
```

### What happens when you run `npm start`:

1. **Python bot starts** - Connects to your Daily room and creates a Tavus conversation
2. **Conversation URL extracted** - The launcher captures the Tavus URL from bot logs
3. **Frontend launches** - React app starts on `http://localhost:3000`
4. **Auto-connect** - Frontend automatically connects to the Tavus replica
5. **Ready!** - System is running and monitoring for disconnections

### Using the system:

1. **View the replica:**
   - Open your browser to `http://localhost:3000`
   - You should see the Tavus replica video (initially static)
   - At the bottom left, you'll see "Connected to: Tavus Echo Audio Stream"

2. **Provide audio input:**
   - Open a new tab/window and go to your Daily room URL (from `.env`)
   - Allow microphone permissions
   - Start speaking - the replica will animate with your voice!

3. **Stop the system:**
   - Press `Ctrl+C` in the terminal to stop both bot and frontend

### Expected Terminal Output:

```
╔══════════════════════════════════════════════════════════════╗
║          Tavus Audio Passthrough Launcher                    ║
╚══════════════════════════════════════════════════════════════╝

[Python Bot] Starting...
[Bot] ᓚᘏᗢ Pipecat 0.0.93...
[Bot] Creating Tavus conversation...
[Bot] Created Tavus conversation: {'conversation_url': 'https://tavus.daily.co/xxxxx', ...}

================================================================================
✓ Tavus Conversation URL: https://tavus.daily.co/xxxxx
✓ React frontend will auto-connect
================================================================================

[React Frontend] Starting on http://localhost:3000...
[Frontend] Local: http://localhost:3000

✓ All services started successfully!
✓ Bot is capturing audio from Daily room
✓ Frontend is displaying the Tavus replica
```

See [LAUNCHER.md](./LAUNCHER.md) for detailed launcher documentation.

## Manual Usage

If you prefer to run components separately:

1. **Start the bot:**
```bash
python main.py
```

2. **Look for the Tavus conversation URL in the logs:**
   - The bot will create a Tavus conversation and log details like:
     ```
     Created Tavus conversation: {'conversation_url': 'https://tavus.daily.co/xxxxx', ...}
     ```
   - Copy the `conversation_url` - this is where you'll view the animated video replica

3. **Join your audio passthrough room:**
   - Open your Daily room URL (from `.env`) in a browser
   - Allow microphone access
   - Start speaking - your audio is being captured and sent to Tavus

4. **View the animated replica:**
   - Option A: Open the Tavus conversation URL directly in a browser
   - Option B: Use the React viewer - `cd frontend && npm run dev`, then paste the URL

### Workflow Summary

```
[You] → Daily Room (audio input) → Bot → Tavus API → Tavus Conversation URL (video output)
```

- **Audio Input**: Join the Daily room from your `.env` file
- **Video Output**: Join the Tavus conversation URL logged by the bot

## Frontend Viewer

A React-based viewer app is included in the `frontend/` directory for displaying the Tavus replica in fullscreen.

### Quick Start

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000` and paste the Tavus conversation URL from the bot logs.

### Features

- Fullscreen video display
- Automatic microphone and camera disabling (viewer-only mode)
- Clean, modern UI
- No local media access required

See `frontend/README.md` for more details.

## Configuration

### Audio Settings

The audio is configured with:
- **Input**: 16kHz sample rate from Daily room (main.py:65)
- **Output**: Disabled to prevent echo (main.py:66)

You can adjust these in the `DailyParams`:

```python
DailyParams(
    audio_in_enabled=True,
    audio_in_sample_rate=16000,
    audio_out_enabled=False,  # Disabled to prevent echo
    transcription_enabled=False,
    vad_enabled=False,
)
```

### Pipeline Customization

The core pipeline is defined in main.py:83-92:

```python
pipeline = Pipeline([
    transport.input(),   # Incoming audio from user
    converter,           # Convert audio frames to TTS format
    tavus,               # Tavus video service (receives TTS audio, outputs video)
    transport.output(),  # Output combined audio/video
])
```

You can add additional audio processing frames between `converter` and `tavus` if needed (e.g., noise reduction, audio filters, volume control).

## How It Works

1. **Bot Initialization**: The bot connects to your Daily room (for audio input) and creates a Tavus conversation
2. **Audio Capture**: When you join the Daily room and speak, `transport.input()` captures your audio as `InputAudioRawFrame`
3. **Frame Conversion**: `AudioToTTSFrameConverter` converts `InputAudioRawFrame` to `TTSAudioRawFrame` format
4. **Tavus Processing**: `TavusVideoService` receives the TTS audio frames and sends them to the Tavus API
5. **Replica Animation**: Tavus animates the video replica with your voice in real-time
6. **Video Output**: The animated replica is visible in the Tavus conversation URL
7. **Echo Prevention**: Audio output is disabled in the Daily room to prevent you from hearing your own voice

### Key Architecture Points

- **Two Separate Rooms**:
  - Daily room (you join for audio input)
  - Tavus conversation (viewers join to see the animated replica)
- **Frame Conversion**: Custom processor converts input audio to TTS format for Tavus
- **No Echo**: Bot's audio output is disabled in the passthrough room

The key difference from the standard example is that we've removed the STT, LLM, and TTS components, allowing direct audio flow to animate the replica with the user's voice.

## Troubleshooting

### Installation Issues

- **`pip install` fails**:
  - Make sure you're using Python 3.8+: `python --version`
  - Try using `python3` instead of `python`
  - Consider using a virtual environment (see installation step 3)

- **`npm install` fails in frontend**:
  - Make sure you have Node.js 18+: `node --version`
  - Delete `node_modules` and `package-lock.json`, then try again
  - Try `npm install --legacy-peer-deps`

- **Module not found errors**:
  - Run `npm install` in both root AND frontend directories
  - Check that you have a `node_modules` folder in both places

### Launcher Issues

- **Launcher only starts frontend (not bot)**:
  - Make sure you're running `npm start` from the project root, not the `frontend/` directory
  - Check that `launcher.js` exists in the root directory
  - Verify `package.json` in root has `"start": "node launcher.js"`

- **Python command not found**:
  - Try `python3` instead - edit `launcher.js` line 80 to use `'python3'`
  - Make sure Python is in your PATH

- **Bot won't start**:
  - Verify your Daily room URL, Tavus API key, and replica ID are correct in `.env`
  - Make sure `.env` file exists (copy from `.env.example`)
  - Check Python dependencies are installed

### Runtime Issues

- **No audio captured**:
  - Ensure you've joined the correct Daily room (the one in your `.env`)
  - Check that microphone permissions are granted in your browser
  - Look for "Participant joined" message in the bot logs

- **Video not animating**:
  - Check the logs for Tavus API errors
  - Verify your audio is being captured (check bot debug logs)
  - Make sure you're speaking into the Daily room (not the Tavus conversation)
  - The replica will only move when receiving audio input

- **Black screen in browser**:
  - Check browser console (F12) for errors
  - Verify you see "Connected to: Tavus Echo Audio Stream" at bottom left
  - Try clicking on the video (sometimes needs user interaction)
  - Wait a few seconds for the video track to load

- **Hearing echo**:
  - Verify `audio_out_enabled=False` in main.py:66
  - Make sure you're not in both rooms at the same time

- **Can't find conversation URL**:
  - Look for the green banner in terminal logs with the URL
  - Check `frontend/src/conversation-url.json` file
  - Look for log line containing `Created Tavus conversation` with `conversation_url`

## License

This example is provided as-is for educational purposes.

## Architecture Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   You in    │         │              │         │  React Viewer   │
│  Daily Room ├────────>│  Pipecat Bot ├────────>│    (localhost)  │
│   (audio)   │  audio  │              │  video  │  Tavus Convo URL│
└─────────────┘         └──────┬───────┘         └─────────────────┘
                               │
                               │ Tavus API
                               ▼
                        ┌──────────────┐
                        │  Tavus Video │
                        │   Animation  │
                        └──────────────┘

Flow:
1. You speak in Daily room → Bot captures audio
2. Bot sends audio to Tavus API → Animates replica
3. Replica video streams to Tavus conversation URL
4. React viewer displays fullscreen video (mic/camera disabled)
```

## References

- [Pipecat Documentation](https://github.com/pipecat-ai/pipecat)
- [Tavus Video Service Example](https://github.com/pipecat-ai/pipecat/blob/main/examples/foundational/21a-tavus-video-service.py)
- [Tavus API Documentation](https://docs.tavus.io/)
- [Daily.co Documentation](https://docs.daily.co/)
