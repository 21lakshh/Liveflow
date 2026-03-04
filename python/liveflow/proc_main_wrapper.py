from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger("liveflow.proc_main_wrapper")

# Guard against re-entrant calls (shouldn't happen with the fix, but safety first)
_running = False


def proc_main(args: Any) -> None:
    """
    Drop-in replacement for livekit.agents.ipc.job_proc_lazy_main.proc_main.
    Sets up the Liveflow forwarder and interceptor, then delegates.
    """
    global _running
    if _running:
        # Prevent infinite recursion — this means job_proc_lazy_main.proc_main
        # was incorrectly patched (it should be left unpatched).
        from livekit.agents.ipc.job_proc_lazy_main import proc_main as _real
        return _real(args)
    _running = True

    port_str = os.environ.get("LIVEFLOW_PORT")
    if port_str:
        try:
            port = int(port_str)
            logger.info(f"Setting up Liveflow in child process (pid={os.getpid()}, port={port})")

            # Start a forwarder (WS client) connecting to parent's WS server
            from liveflow.forwarder import start_forwarder
            fwd = start_forwarder(port)
            logger.info(f"Forwarder started, connected={fwd._connected.is_set()}")

            # Install the AgentSession interceptor in this child process
            from liveflow.interceptor import install
            install()

            logger.info(f"Liveflow active in child process (pid={os.getpid()}, port={port})")
        except Exception as e:
            logger.warning(f"Failed to setup Liveflow in child process: {e}", exc_info=True)
    else:
        logger.debug("LIVEFLOW_PORT not set, skipping child process setup")

    # Import and call the REAL proc_main from job_proc_lazy_main.
    # This is safe because child_hook ONLY patches job_proc_executor,
    # leaving job_proc_lazy_main.proc_main as the original.
    from livekit.agents.ipc.job_proc_lazy_main import proc_main as _real_proc_main
    return _real_proc_main(args)
