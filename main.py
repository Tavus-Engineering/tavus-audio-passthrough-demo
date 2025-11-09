"""
Tavus Audio Passthrough Example

This example demonstrates how to pipe incoming audio directly to Tavus
to animate the video replica with the user's voice instead of TTS output.
"""

import asyncio
import aiohttp
import os
import sys

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


class AudioToTTSFrameConverter(FrameProcessor):
    """
    Converts incoming audio frames (InputAudioRawFrame) to TTS audio frames (TTSAudioRawFrame)
    so they can be processed by TavusVideoService.
    """

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        # Convert incoming audio to TTS format for Tavus
        if isinstance(frame, InputAudioRawFrame):
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

        # Create audio converter
        converter = AudioToTTSFrameConverter()

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
            await transport.capture_participant_audio(participant["id"])
            logger.info(f"Participant {participant['id']} joined, starting audio passthrough")

        @transport.event_handler("on_participant_left")
        async def on_participant_left(transport, participant, reason):
            logger.info(f"Participant {participant['id']} left")
            await task.queue_frame(EndFrame())

        @transport.event_handler("on_call_state_updated")
        async def on_call_state_updated(transport, state):
            logger.info(f"Call state updated: {state}")

        runner = PipelineRunner()

        await runner.run(task)


if __name__ == "__main__":
    asyncio.run(main())
