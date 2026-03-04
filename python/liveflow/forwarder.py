from __future__ import annotations

import asyncio
import json
import logging
import os
import threading
from typing import Optional

from .protocol import BaseMessage

logger = logging.getLogger("liveflow.forwarder")


class LiveflowForwarder:
    """
    A WebSocket client that forwards intercepted messages to the
    parent process's LiveflowServer.

    Used in child processes spawned by LiveKit's multiprocessing model.
    """

    def __init__(self, port: int, host: str = "127.0.0.1"):
        self._host = host
        self._port = port
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._thread: Optional[threading.Thread] = None
        self._queue: asyncio.Queue[str] = asyncio.Queue()
        self._connected = threading.Event()
        self._stop_event: Optional[asyncio.Event] = None
        self._ws = None

    @property
    def port(self) -> int:
        return self._port

    def start(self) -> None:
        """Start the forwarding thread. Non-blocking."""
        self._thread = threading.Thread(
            target=self._run_loop, daemon=True, name="liveflow-fwd"
        )
        self._thread.start()
        # Wait briefly for connection (but don't block agent startup)
        self._connected.wait(timeout=3)

    def broadcast(self, message: BaseMessage) -> None:
        """
        Queue a message for forwarding. Thread-safe.
        Same interface as LiveflowServer.broadcast() so the interceptor
        doesn't need to know if it's in a parent or child process.
        """
        try:
            json_str = message.model_dump_json()
            if self._loop and not self._loop.is_closed():
                self._loop.call_soon_threadsafe(self._queue.put_nowait, json_str)
        except Exception as e:
            logger.warning(f"Failed to queue message for forwarding: {e}")

    def stop(self) -> None:
        """Shut down the forwarder."""
        if self._loop and self._stop_event:
            self._loop.call_soon_threadsafe(self._stop_event.set)
        if self._thread:
            self._thread.join(timeout=3)

    def _run_loop(self) -> None:
        """Background thread: connect + forward loop."""
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        self._stop_event = asyncio.Event()
        try:
            self._loop.run_until_complete(self._forward_loop())
        except Exception as e:
            logger.debug(f"Forwarder loop ended: {e}")
        finally:
            self._loop.close()

    async def _forward_loop(self) -> None:
        """Connect to the server and forward queued messages."""
        import websockets

        url = f"ws://{self._host}:{self._port}"
        retry_delay = 0.5

        while not self._stop_event.is_set():
            try:
                async with websockets.connect(url) as ws:
                    self._ws = ws
                    self._connected.set()
                    logger.info(f"Forwarder connected to {url}")
                    retry_delay = 0.5  # reset on success

                    # Forward messages until disconnected or stopped
                    while not self._stop_event.is_set():
                        try:
                            json_str = await asyncio.wait_for(
                                self._queue.get(), timeout=1.0
                            )
                            await ws.send(json_str)
                        except asyncio.TimeoutError:
                            continue  # just check stop_event
                        except Exception as e:
                            logger.warning(f"Forward send error: {e}")
                            break

            except Exception as e:
                logger.debug(f"Forwarder connection failed: {e}, retrying in {retry_delay}s")
                self._connected.clear()
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 5.0)


# Module-level singleton
_forwarder: Optional[LiveflowForwarder] = None


def get_forwarder() -> Optional[LiveflowForwarder]:
    """Get the global forwarder instance (used in child processes)."""
    return _forwarder


def start_forwarder(port: int) -> LiveflowForwarder:
    """Create and start a forwarder that sends messages to the given port.
    
    Safe to call multiple times — returns existing instance if already started.
    """
    global _forwarder
    if _forwarder is not None:
        logger.debug("Forwarder already running, reusing existing instance")
        return _forwarder
    _forwarder = LiveflowForwarder(port=port)
    _forwarder.start()
    return _forwarder
