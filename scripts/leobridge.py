import leo.core.leoBridge as leoBridge
import sys
import os
import time

# globals
bridge = leoBridge.controller(gui='nullGui',
                              loadPlugins=False,  # True: attempt to load plugins.
                              readSettings=True,  # True: read standard settings files.
                              silent=False,      # True: don't print signon messages.
                              verbose=False)     # True: print informational messages.
bridgeGlobals = bridge.globals()
commander = None


def es(p_string):
    """Emit String Function"""
    print(p_string, flush=True)


def outputTest():
    """Emit a test"""
    global bridgeGlobals, commander
    # commander.dumpOutline()
    # es(commander.dumpOutline().toString())
    for p in commander.all_positions():
        print(' '*p.level()+p.h)


def openFile(p_file):
    """Open a leo file via leoBridge controller"""
    global bridge, commander
    es("Open .leo file "+p_file)
    commander = bridge.openLeoFile(p_file)
    if(commander):
        # Sending FILEREADY CODE
        es("fileOpenedReady")


def processCommand(p_string):
    """Process incoming command"""
    p_string = p_string.strip()
    if p_string == "test":
        outputTest()
    if p_string.startswith("openFile:"):
        openFile(p_string[9:])


def main():
    """python script for leo integration via leoBridge"""
    sys.stdin = os.fdopen(sys.stdin.fileno(), 'r')
    # Sending READY CODE
    es("leoBridgeReady")

    # Pocess incoming commands until EXIT CODE
    exitFlag = False
    while not exitFlag:
        w_line = sys.stdin.readline()
        if w_line.strip() == "exit":
            exitFlag = True
        else:
            processCommand(w_line)

    # end
    es("finally exiting leobridge")


# Startup
if __name__ == '__main__':
    main()
