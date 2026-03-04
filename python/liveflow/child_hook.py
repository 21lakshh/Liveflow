from __future__ import annotations

import logging
from typing import Callable, Optional

logger = logging.getLogger("liveflow.child_hook")

_hooked = False
_original_proc_main: Optional[Callable] = None


def install_child_process_hook() -> None:
    """
    Replace LiveKit's proc_main with liveflow.proc_main_wrapper.proc_main.
    
    IMPORTANT: We ONLY patch exec_mod (job_proc_executor), NOT job_mod
    (job_proc_lazy_main). This is because:
      - _create_process() uses LOAD_GLOBAL to resolve proc_main from exec_mod
      - Our wrapper (proc_main_wrapper.py) imports the REAL proc_main from
        job_proc_lazy_main. If we patched that too, the wrapper would get
        itself → infinite recursion!
    
    The wrapper is a standalone module-level function with its OWN
    __module__ and __qualname__, so pickle correctly serializes it as
    'liveflow.proc_main_wrapper.proc_main'. When the child process
    unpickles it, it imports liveflow.proc_main_wrapper and gets the
    wrapper — which does Liveflow setup before calling the real proc_main.
    """
    global _hooked, _original_proc_main

    if _hooked:
        return

    try:
        import livekit.agents.ipc.job_proc_lazy_main as job_mod
        import livekit.agents.ipc.job_proc_executor as exec_mod
        from liveflow.proc_main_wrapper import proc_main as wrapper_proc_main

        _original_proc_main = job_mod.proc_main

        # ONLY patch exec_mod (where _create_process reads proc_main via LOAD_GLOBAL)
        # Do NOT patch job_mod — the wrapper imports from there to get the real proc_main
        exec_mod.proc_main = wrapper_proc_main

        _hooked = True
        logger.debug(
            "Child process hook installed "
            f"(proc_main → {wrapper_proc_main.__module__}.{wrapper_proc_main.__qualname__})"
        )

    except ImportError as e:
        logger.warning(f"Could not patch LiveKit proc_main: {e}")
    except Exception as e:
        logger.warning(f"Child process hook failed: {e}")


def uninstall_child_process_hook() -> None:
    """Restore original proc_main."""
    global _hooked, _original_proc_main

    if not _hooked or _original_proc_main is None:
        return

    try:
        import livekit.agents.ipc.job_proc_executor as exec_mod

        exec_mod.proc_main = _original_proc_main
    except ImportError:
        pass

    _original_proc_main = None
    _hooked = False
