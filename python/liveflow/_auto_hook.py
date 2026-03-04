from __future__ import annotations

import os


def _try_install_hook() -> None:
    """Install the child process hook if LIVEFLOW_PORT is set."""
    port = os.environ.get("LIVEFLOW_PORT")
    if not port:
        return  # Liveflow not active, do nothing

    try:
        from liveflow.child_hook import install_child_process_hook
        install_child_process_hook()
    except ImportError:
        pass  # livekit or liveflow not available, silently skip
    except Exception:
        pass  # Any error, silently skip — don't break user's process


# Auto-execute on import (triggered by .pth file)
_try_install_hook()
