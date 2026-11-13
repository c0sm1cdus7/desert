#!/usr/bin/env python3
"""A command on a real pseudo-terminal of a given size, as a person's terminal runs it.

What comes on stdin goes to its keyboard, byte for byte and in the chunks it came; what it paints goes to stdout.
Nothing is emulated: the terminal's line discipline is the system's own.

Usage: open-pty.py <cols> <rows> <command> [args...]
"""
import fcntl
import os
import pty
import select
import struct
import sys
import termios


def main() -> int:
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
        os.close(master)
        os.close(slave)
        os.execvp(command[0], command)
    os.close(slave)
    keyboard = 0
    watched = [keyboard, master]
    while True:
        ready, _, _ = select.select(watched, [], [])
        if master in ready:
            try:
                painted = os.read(master, 65536)
            except OSError:
                break
            if not painted:
                break
            os.write(1, painted)
        if keyboard in ready:
            typed = os.read(keyboard, 65536)
            if typed:
                os.write(master, typed)
            else:
                watched.remove(keyboard)
    _, status = os.waitpid(pid, 0)
    return os.waitstatus_to_exitcode(status)


if __name__ == "__main__":
    sys.exit(main())
