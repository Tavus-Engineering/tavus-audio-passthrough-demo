# Tavus Replica Viewer

A simple React frontend for viewing the Tavus video replica in fullscreen. This viewer joins the Tavus conversation as a passive participant with camera and microphone disabled.

## Features

- Clean, fullscreen video display
- Automatic microphone and camera disabling
- Simple URL input interface
- Responsive and mobile-friendly
- No audio/video input from viewer

## Installation

```bash
cd frontend
npm install
```

## Usage

1. Start the development server:
```bash
npm run dev
```

2. Open your browser to `http://localhost:3000`

3. Enter the Tavus conversation URL (from the bot logs):
   - Format: `https://tavus.daily.co/xxxxx`

4. Click "Join Room" to view the replica

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## How It Works

1. Uses Daily React hooks for WebRTC connection
2. Joins the room with audio/video disabled
3. Subscribes to remote video tracks (the Tavus replica)
4. Displays the replica video in fullscreen
5. No local media devices are accessed

## Configuration

The viewer is configured to:
- Start with video and audio **OFF**
- Not publish any local tracks
- Auto-subscribe to remote video tracks
- Display video in `contain` mode (maintains aspect ratio)

You can modify these settings in `src/VideoPlayer.jsx` if needed.
