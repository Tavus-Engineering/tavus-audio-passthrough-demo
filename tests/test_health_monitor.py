"""Regression test: the health monitor must not kill a live audio stream.

main.py exits the process when no "activity" is seen for 60 seconds. Activity was
only recorded on participant/call-state events, so a healthy call that simply
keeps streaming audio was killed about a minute after the last event. This test
runs the real main() with the third-party SDKs stubbed and a virtual clock.

Run from the repo root: python -m unittest discover -s tests
"""
import asyncio
import importlib
import os
import sys
import types
import unittest
from unittest import mock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REAL_SLEEP = asyncio.sleep


class Clock:
    t = 0.0


class Frame:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


class InputAudioRawFrame(Frame):
    pass


class TTSAudioRawFrame(Frame):
    pass


class EndFrame(Frame):
    pass


class FrameDirection:
    DOWNSTREAM = "down"


class FrameProcessor:
    def __init__(self, *args, **kwargs):
        self.pushed = []

    async def process_frame(self, frame, direction):
        pass

    async def push_frame(self, frame, direction=None):
        self.pushed.append(frame)


def build_stubs(handlers, converters):
    def module(name, **attrs):
        mod = types.ModuleType(name)
        mod.__dict__.update(attrs)
        return mod

    class Transport:
        def __init__(self, *args, **kwargs):
            pass

        def input(self):
            return object()

        def output(self):
            return object()

        def event_handler(self, name):
            def register(fn):
                handlers[name] = fn
                return fn

            return register

        async def capture_participant_audio(self, participant_id):
            pass

    class Task:
        def __init__(self, *args, **kwargs):
            pass

        async def queue_frame(self, frame):
            pass

    class Pipeline:
        def __init__(self, steps):
            for step in steps:
                if isinstance(step, FrameProcessor):
                    converters.append(step)

    class Runner:
        async def run(self, task):
            transport = object()
            await handlers["on_first_participant_joined"](transport, {"id": "p1"})
            for _ in range(120):  # two virtual minutes of steady audio
                Clock.t += 1
                for converter in converters:
                    await converter.process_frame(
                        InputAudioRawFrame(audio=b"\0", sample_rate=16000, num_channels=1),
                        FrameDirection.DOWNSTREAM,
                    )
                await REAL_SLEEP(0)

    class Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

    class Logger:
        def __getattr__(self, name):
            return lambda *a, **k: None

    return {
        "aiohttp": module("aiohttp", ClientSession=Session),
        "dotenv": module("dotenv", load_dotenv=lambda **k: None),
        "loguru": module("loguru", logger=Logger()),
        "pipecat": module("pipecat"),
        "pipecat.frames": module("pipecat.frames"),
        "pipecat.frames.frames": module(
            "pipecat.frames.frames",
            EndFrame=EndFrame,
            Frame=Frame,
            InputAudioRawFrame=InputAudioRawFrame,
            TTSAudioRawFrame=TTSAudioRawFrame,
        ),
        "pipecat.pipeline": module("pipecat.pipeline"),
        "pipecat.pipeline.pipeline": module("pipecat.pipeline.pipeline", Pipeline=Pipeline),
        "pipecat.pipeline.runner": module("pipecat.pipeline.runner", PipelineRunner=Runner),
        "pipecat.pipeline.task": module(
            "pipecat.pipeline.task",
            PipelineParams=lambda **k: None,
            PipelineTask=Task,
        ),
        "pipecat.processors": module("pipecat.processors"),
        "pipecat.processors.frame_processor": module(
            "pipecat.processors.frame_processor",
            FrameDirection=FrameDirection,
            FrameProcessor=FrameProcessor,
        ),
        "pipecat.services": module("pipecat.services"),
        "pipecat.services.tavus": module(
            "pipecat.services.tavus", TavusVideoService=lambda **k: object()
        ),
        "pipecat.transports": module("pipecat.transports"),
        "pipecat.transports.services": module("pipecat.transports.services"),
        "pipecat.transports.services.daily": module(
            "pipecat.transports.services.daily",
            DailyParams=lambda **k: None,
            DailyTransport=Transport,
        ),
    }


class VirtualLoop:
    def time(self):
        return Clock.t


class FakeAsyncio:
    """Real asyncio, except sleep() and get_event_loop().time() use a virtual clock."""

    def __getattr__(self, name):
        return getattr(asyncio, name)

    async def sleep(self, seconds):
        # The runner advances the clock one virtual second per step; sleeping
        # only yields, so the monitor re-checks on every step.
        await REAL_SLEEP(0)

    def get_event_loop(self):
        return VirtualLoop()


class HealthMonitorTest(unittest.TestCase):
    def test_steady_audio_is_not_treated_as_a_dead_connection(self):
        Clock.t = 0.0
        handlers, converters, exits = {}, [], []
        sys.path.insert(0, ROOT)
        stubs = build_stubs(handlers, converters)
        try:
            with mock.patch.dict(sys.modules, stubs):
                sys.modules.pop("main", None)
                main = importlib.import_module("main")
                with mock.patch.object(main, "asyncio", FakeAsyncio()), mock.patch.object(
                    main.os, "_exit", lambda code: exits.append(code)
                ):
                    asyncio.run(main.main())
        finally:
            sys.path.remove(ROOT)
            sys.modules.pop("main", None)
        self.assertEqual(exits, [], "health monitor forced an exit during a live audio stream")


if __name__ == "__main__":
    unittest.main()
