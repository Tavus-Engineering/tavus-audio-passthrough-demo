# Tavus Audio Passthrough

This project demonstrates how to pipe incoming audio directly to Tavus using TavusTransport in Pipecat, bypassing the typical TTS pipeline. This is useful when you want to synchronize a user's voice directly with a Tavus video replica instead of using synthesized speech.

## Overview

The typical Pipecat pipeline with Tavus looks like:
```
Input → STT → LLM → TTS → Tavus → Output
```

This project simplifies it to:
```
Input → Output (via TavusTransport)
```

TavusTransport automatically handles:
- Creating the Tavus conversation and Daily room
- Passing incoming audio to animate the video replica
- Filtering the replica's own audio to prevent echo
- Managing the full conversation lifecycle

## Features

- Direct audio passthrough to Tavus replica
- No speech-to-text, LLM, or text-to-speech processing
- Real-time audio/video synchronization
- Automatic Tavus conversation and room creation
- Built-in echo cancellation (filters replica's own audio)
- Configurable sample rate (24kHz for Tavus)

## Prerequisites

- Python 3.8+
- Tavus API key and replica ID (no Daily.co account needed - TavusTransport creates rooms automatically)
- Pipecat library installed

## Installation

1. Clone or download this project:
```bash
cd tavus-audio-passthrough
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your credentials:
   - `TAVUS_API_KEY`: Your Tavus API key
   - `TAVUS_REPLICA_ID`: Your Tavus replica ID
   - `TAVUS_PERSONA_ID`: (Optional) Defaults to "pipecat-stream" which uses the bot's audio

## Usage

Run the application:
```bash
python main.py
```

The bot will:
1. Create a Tavus conversation and Daily room automatically
2. Log the room URL for you to join
3. Wait for a participant to join
4. Capture incoming audio from the participant
5. Pass the audio directly to the Tavus replica to animate the video
6. Output the synchronized video/audio stream back to the room

## Configuration

### Audio Settings

The audio output is configured for 24kHz sample rate (main.py:43-46) to match Tavus requirements. You can adjust this in the `TavusParams`:

```python
TavusParams(
    audio_out_enabled=True,
    audio_out_sample_rate=24000,  # Adjust if needed
)
```

### Pipeline Customization

The core pipeline is defined in main.py:51-56:

```python
pipeline = Pipeline([
    transport.input(),   # Captures incoming audio from participants
    transport.output(),  # Outputs Tavus video with synced audio
])
```

You can add additional audio processing frames between `transport.input()` and `transport.output()` if needed (e.g., noise reduction, audio filters, volume control).

## How It Works

1. **Initialization**: TavusTransport creates a Tavus conversation via API and receives a Daily room URL
2. **Connection**: The transport connects to the Daily room with the Tavus replica already present
3. **Audio Capture**: Incoming audio frames from participants are captured by `transport.input()`
4. **Replica Animation**: TavusTransport internally passes the audio to the Tavus API to animate the video replica
5. **Echo Prevention**: The transport filters out the replica's own audio to prevent feedback loops
6. **Output**: The synchronized video/audio is streamed back via `transport.output()`

The key difference from the standard example is that we've removed the STT, LLM, and TTS components, allowing direct audio flow to animate the replica with the user's voice.

## Troubleshooting

- **Room creation fails**: Verify your Tavus API key and replica ID are correct
- **No audio**: Ensure the participant has granted microphone permissions in their browser
- **Video not syncing**: Check the logs for any Tavus API errors
- **Connection issues**: Ensure you have a stable internet connection and the Tavus service is operational

## License

This example is provided as-is for educational purposes.

## References

- [Pipecat Documentation](https://github.com/pipecat-ai/pipecat)
- [Original Tavus Example](https://github.com/pipecat-ai/pipecat/blob/main/examples/foundational/21a-tavus-video-service.py)
- [Tavus API Documentation](https://docs.tavus.io/)
- [Daily.co Documentation](https://docs.daily.co/)
