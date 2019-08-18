import leo.core.leoBridge as leoBridge
import sys
import os
import time

sys.stdin = os.fdopen(sys.stdin.fileno(), 'r')


def es(p_string):
    print(p_string, flush=True)


def processCommand(p_string):
    es("process command: " + p_string)


# def main():
# """python script for leo integration via leoBridge"""

controller = leoBridge.controller(gui='nullGui',
                                  loadPlugins=True,  # True: attempt to load plugins.
                                  readSettings=True,  # True: read standard settings files.
                                  silent=False,      # True: don't print signon messages.
                                  verbose=False)     # True: print informational messages.

g = controller.globals()

es("leobridge Started")

time.sleep(2)
es("leobridge slept")

es(dir(g))
exitFlag = False

while not exitFlag:
    line = sys.stdin.readline()
    if line.strip() == "exit":
        es("exiting leobridge via break")
        exitFlag = True
    else:
        es("start"+line+"end")


es("finally exiting leobridge")


# Startup
# if __name__ == '__main__':
#     main()
