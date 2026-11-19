#!/usr/bin/env python3
"""Bridge a real PTY. fd 3 reports waitpid; fd 4 requests the helper's own Ctrl-C.

Usage: open-pty.py <cols> <rows> <command> [args...]
"""
import errno
import fcntl
import json
import os
import pty
import select
import signal
import struct
import sys
import termios


def relay(master, pid):
    watched = [0, master, 4]
    status = None
    interrupted = False
    while True:
        ready, _, _ = select.select(watched, [], [])
        if master in ready:
            try:
                painted = os.read(master, 65536)
            except OSError as error:
                if error.errno != errno.EIO:
                    raise
                break
            if not painted:
                break
            os.write(1, painted)
        if 0 in ready:
            typed = os.read(0, 65536)
            if typed:
                os.write(master, typed)
            else:
                watched.remove(0)
        if 4 in ready:
            request = os.read(4, 65536)
            watched.remove(4)
            if request == b"close\n":
                ended, status = os.waitpid(pid, os.WNOHANG)
                if ended:
                    break
                status = None
                interrupted = True
                os.write(master, b"\x03")
    if status is None:
        _, status = os.waitpid(pid, 0)
    code = os.waitstatus_to_exitcode(status)
    return {"code": code if code >= 0 else None,
            "signal": signal.Signals(-code).name if code < 0 else None,
            "interrupted": interrupted}


def main():
    cols, rows = int(sys.argv[1]), int(sys.argv[2])
    command = sys.argv[3:]
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
    pid = os.fork()
    if pid == 0:
        os.setsid()
        fcntl.ioctl(slave, termios.TIOCSCTTY, 0)
        for fd in (0, 1, 2):
            os.dup2(slave, fd)
        for fd in (master, slave, 3, 4):
            os.close(fd)
        os.execvp(command[0], command)
    os.close(slave)
    try:
        result = relay(master, pid)
        os.write(3, json.dumps(result).encode("utf8"))
    finally:
        os.close(master)


if __name__ == "__main__":
    main()
