# Tavus Audio Passthrough

This project demonstrates how to pipe incoming audio directly to Tavus in Pipecat, bypassing the typical TTS pipeline. This is useful when you want to synchronize a user's voice directly with a Tavus video replica instead of using synthesized speech.

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

- Direct audio passthrough to Tavus replica
- No speech-to-text, LLM, or text-to-speech processing
- Real-time audio/video synchronization
- Two-room architecture: separate audio input room and video output conversation
- No audio echo in the passthrough room
- Configurable sample rate (16kHz input, 24kHz to Tavus)

## Prerequisites

- Python 3.8+
- A Daily.co account and permanent room URL for audio passthrough
- Tavus API key and replica ID
- Pipecat library installed

## Installation

1. **Create a Daily room for audio passthrough:**
   - Create a new room (this will be your permanent audio passthrough room)
   - Copy the room URL (e.g., `https://your-domain.daily.co/your-room`)
   - This is where you'll join to provide audio input

2. Clone or download this project:
```bash
cd tavus-audio-passthrough
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
cp .env.example .env
```

5. Edit `.env` and add your credentials:
   - `DAILY_ROOM_URL`: Your Daily room URL from step 1 (for audio passthrough)
   - `TAVUS_API_KEY`: Your Tavus API key
   - `TAVUS_REPLICA_ID`: Your Tavus replica ID

## Usage

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
   - Open the Tavus conversation URL (from step 2) in another browser tab
   - You'll see the video replica animated with your voice
   - You won't hear audio echo in your passthrough room

### Workflow Summary

```
[You] → Daily Room (audio input) → Bot → Tavus API → Tavus Conversation URL (video output)
```

- **Audio Input**: Join the Daily room from your `.env` file
- **Video Output**: Join the Tavus conversation URL logged by the bot

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

- **Bot won't start**: Verify your Daily room URL, Tavus API key, and replica ID are correct in `.env`
- **No audio captured**:
  - Ensure you've joined the correct Daily room (the one in your `.env`)
  - Check that microphone permissions are granted in your browser
  - Look for "Participant joined" message in the bot logs
- **Video not animating**:
  - Check the logs for Tavus API errors
  - Verify your audio is being captured (check bot debug logs)
  - Ensure you're viewing the Tavus conversation URL (not the Daily room URL)
- **Hearing echo**:
  - Verify `audio_out_enabled=False` in the DailyParams
  - Make sure you're not in both rooms at the same time
- **Can't find conversation URL**: Look for the log line containing `Created Tavus conversation` with the `conversation_url` field

## License

This example is provided as-is for educational purposes.

## Architecture Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   You in    │         │              │         │   Viewers   │
│  Daily Room ├────────>│  Pipecat Bot ├────────>│  in Tavus   │
│   (audio)   │  audio  │              │  video  │  Convo URL  │
└─────────────┘         └──────┬───────┘         └─────────────┘
                               │
                               │ Tavus API
                               ▼
                        ┌──────────────┐
                        │  Tavus Video │
                        │   Animation  │
                        └──────────────┘
```

## References

- [Pipecat Documentation](https://github.com/pipecat-ai/pipecat)
- [Tavus Video Service Example](https://github.com/pipecat-ai/pipecat/blob/main/examples/foundational/21a-tavus-video-service.py)
- [Tavus API Documentation](https://docs.tavus.io/)
- [Daily.co Documentation](https://docs.daily.co/)
