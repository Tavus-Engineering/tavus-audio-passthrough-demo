"""
Tavus Audio Passthrough Example

This example demonstrates how to pipe incoming audio directly to Tavus
to animate the video replica with the user's voice instead of TTS output.
"""

import asyncio
import aiohttp
import os
import sys
import signal

from pipecat.frames.frames import EndFrame, Frame, InputAudioRawFrame, TTSAudioRawFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.tavus import TavusVideoService
from pipecat.transports.services.daily import DailyParams, DailyTransport

from loguru import logger

from dotenv import load_dotenv
load_dotenv(override=True)

logger.remove(0)
logger.add(sys.stderr, level="DEBUG")

# Global flag for graceful shutdown
shutdown_flag = False

def signal_handler(sig, frame):
    global shutdown_flag
    shutdown_flag = True
    logger.warning("Received shutdown signal, will exit after current task")

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)


class AudioToTTSFrameConverter(FrameProcessor):
    """
    Converts incoming audio frames (InputAudioRawFrame) to TTS audio frames (TTSAudioRawFrame)
    so they can be processed by TavusVideoService.
    """

    def __init__(self, activity_callback=None):
        super().__init__()
        self.activity_callback = activity_callback

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        # Convert incoming audio to TTS format for Tavus
        if isinstance(frame, InputAudioRawFrame):
            # Update activity timestamp when processing audio
            if self.activity_callback:
                self.activity_callback()

            tts_frame = TTSAudioRawFrame(
                audio=frame.audio,
                sample_rate=frame.sample_rate,
                num_channels=frame.num_channels
            )
            await self.push_frame(tts_frame, direction)
        else:
            # Pass through all other frames
            await self.push_frame(frame, direction)


async def main():
    """
    Main function that sets up a pipeline to pass incoming audio directly to Tavus.
    Uses Daily transport with a manual room URL, converts audio frames, and sends to TavusVideoService.
    """
    last_activity_time = asyncio.get_event_loop().time()
    connection_healthy = True

    def update_activity():
        """Update the last activity timestamp"""
        nonlocal last_activity_time
        last_activity_time = asyncio.get_event_loop().time()

    async def health_monitor():
        """Monitor connection health and force exit if stuck"""
        nonlocal last_activity_time, connection_healthy
        while not shutdown_flag:
            await asyncio.sleep(15)  # Check every 15 seconds
            current_time = asyncio.get_event_loop().time()
            if current_time - last_activity_time > 60:  # 1 minute of no activity
                logger.error("No activity detected for 60 seconds, assuming connection is dead - forcing restart")
                connection_healthy = False
                os._exit(1)  # Force exit

    async with aiohttp.ClientSession() as session:
        # Configure Daily transport with your room URL
        transport = DailyTransport(
            os.getenv("DAILY_ROOM_URL"),
            None,
            "Audio Passthrough Bot",
            DailyParams(
                audio_in_enabled=True,
                audio_in_sample_rate=16000,
                audio_out_enabled=False,  # Disable audio output to prevent echo
                transcription_enabled=False,
                vad_enabled=False,
            ),
        )

        # Initialize Tavus video service
        tavus = TavusVideoService(
            api_key=os.getenv("TAVUS_API_KEY"),
            replica_id=os.getenv("TAVUS_REPLICA_ID"),
            session=session,
        )

        # Monitor Tavus internal events
        if hasattr(tavus, '_client') and hasattr(tavus._client, 'add_event_handler'):
            @tavus._client.add_event_handler("on_participant_left")
            async def on_tavus_participant_left(participant):
                logger.warning(f"Tavus conversation participant left: {participant}, forcing restart")
                os._exit(1)

            @tavus._client.add_event_handler("on_error")
            async def on_tavus_error(error):
                logger.error(f"Tavus internal error: {error}, forcing restart")
                os._exit(1)

        # Create audio converter with activity callback
        converter = AudioToTTSFrameConverter(activity_callback=update_activity)

        # Create pipeline: input -> converter -> tavus -> output
        # Converter changes InputAudioRawFrame to TTSAudioRawFrame for Tavus
        pipeline = Pipeline(
            [
                transport.input(),   # Incoming audio from user
                converter,           # Convert audio frames to TTS format
                tavus,               # Tavus video service (receives TTS audio, outputs video)
                transport.output(),  # Output combined audio/video
            ]
        )

        task = PipelineTask(
            pipeline,
            params=PipelineParams(
                audio_in_sample_rate=16000,
                audio_out_sample_rate=24000,
                allow_interruptions=True,
                enable_metrics=True,
                enable_usage_metrics=True,
            ),
        )

        @transport.event_handler("on_first_participant_joined")
        async def on_first_participant_joined(transport, participant):
            update_activity()
            try:
                await transport.capture_participant_audio(participant["id"])
                logger.info(f"Participant {participant['id']} joined, starting audio passthrough")
            except Exception as e:
                logger.error(f"Error capturing audio for participant {participant['id']}: {e}")

        @transport.event_handler("on_participant_left")
        async def on_participant_left(transport, participant, reason):
            update_activity()
            participant_name = participant.get('user_name', 'Unknown')
            logger.info(f"Participant {participant['id']} ({participant_name}) left (reason: {reason})")

            # If the Tavus replica leaves, that's a critical failure - restart everything
            if 'Tavus' in participant_name or 'pipecat' in participant_name.lower():
                logger.error(f"Critical: Tavus replica {participant_name} left, forcing restart")
                os._exit(1)

        @transport.event_handler("on_call_state_updated")
        async def on_call_state_updated(transport, state):
            update_activity()
            logger.info(f"Call state updated: {state}")
            # If we get disconnected, exit so launcher can restart
            if state == "left":
                logger.error("Transport disconnected, exiting for restart")
                await task.queue_frame(EndFrame())

        @transport.event_handler("on_error")
        async def on_error(transport, error):
            logger.error(f"Transport error: {error}, forcing exit for restart")
            # Force immediate exit on error
            os._exit(1)

        # Start health monitor in background
        health_task = asyncio.create_task(health_monitor())

        runner = PipelineRunner()

        try:
            await runner.run(task)
        except KeyboardInterrupt:
            logger.info("Received interrupt, shutting down gracefully")
        except Exception as e:
            logger.error(f"Pipeline error: {e}")
            # Exit with error code so launcher knows to restart
            sys.exit(1)
        finally:
            health_task.cancel()
            try:
                await health_task
            except asyncio.CancelledError:
                pass


if __name__ == "__main__":
    asyncio.run(main())
