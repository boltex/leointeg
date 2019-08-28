import leo.core.leoBridge as leoBridge
import leo.core.leoNodes as leoNodes
import sys
import os
import time
import json

# globals
bridge = leoBridge.controller(gui='nullGui',
                              loadPlugins=False,  # True: attempt to load plugins.
                              readSettings=True,  # True: read standard settings files.
                              silent=True,      # True: don't print signon messages.
                              verbose=False)     # True: print informational messages.

bridgeGlobals = bridge.globals()

commander = None  # going to store the leo file commander once its opened

gnx_to_vnode = []


def es(p_string):
    """Emit String Function"""
    print(p_string, flush=True)


def outputOutlineData(p_pList):
    w_apList = []
    for p in p_pList:
        w_apList.append(p_to_ap(p))
    # now covert as a whole
    es("outlineDataReady"+json.dumps(w_apList))


def outputTest():
    """Emit a test"""
    global bridgeGlobals, commander
    # commander.dumpOutline()
    # es(commander.dumpOutline().toString())
    es('called test in python')
    # for p in commander.all_positions():
    #     es(json.dumps(p_to_ap(p)))


def openFile(p_file):
    """Open a leo file via leoBridge controller"""
    global bridge, commander
    commander = bridge.openLeoFile(p_file)
    if(commander):
        create_gnx_to_vnode()
        # Sending FILEREADY CODE
        es("fileOpenedReady")


def getAllRootChildren():
    global bridge, commander
    p = commander.rootPosition()
    while p:
        yield p
        p.moveToNext()


def getChildren(p_apJson):
    """EMIT OUT list of children of a node"""
    global bridge, commander
    if(p_apJson):
        w_p = ap_to_p(json.loads(p_apJson))
        if w_p and w_p.hasChildren():
            outputOutlineData(w_p.children())
        else:
            outputOutlineData([])  # default empty
    else:
        outputOutlineData(getAllRootChildren())


def processCommand(p_string):
    """Process incoming command"""
    p_string = p_string.strip()
    if p_string == "test":
        outputTest()
    if p_string.startswith("openFile:"):
        openFile(p_string[9:])  # open file : rest of line as parameter
    if p_string.startswith("getChildren:"):
        getChildren(p_string[12:])  # get child array : rest of line as parameter


def create_gnx_to_vnode():
    global gnx_to_vnode, commander
    t1 = time.clock()
    gnx_to_vnode = {v.gnx: v for v in commander.all_unique_nodes()}
    # This is likely the only data that ever will be needed.
    if 0:
        es('app.create_all_data: %5.3f sec. %s entries' % (
            (time.clock()-t1), len(list(gnx_to_vnode.keys()))))
    test_round_trip_positions()


def test_round_trip_positions():
    '''Test the round tripping of p_to_ap and ap_to_p.'''
    global gnx_to_vnode, commander
    c = commander
    # Bug fix: p_to_ap updates app.gnx_to_vnode. Save and restore it.
    old_d = gnx_to_vnode.copy()
    old_len = len(list(gnx_to_vnode.keys()))
    t1 = time.clock()
    for p in c.all_positions():

        ap = p_to_ap(p)
        p2 = ap_to_p(ap)
        assert p == p2, (repr(p), repr(p2), repr(ap))
    gnx_to_vnode = old_d
    new_len = len(list(gnx_to_vnode.keys()))
    assert old_len == new_len, (old_len, new_len)
    es('app.test_round_trip_positions: %5.3f sec' % (time.clock()-t1))


def ap_to_p(ap):
    '''Convert an archived position to a true Leo position.'''
    childIndex = ap['childIndex']
    v = gnx_to_vnode[ap['gnx']]
    stack = [
        (gnx_to_vnode[d['gnx']], d['childIndex'])
        for d in ap['stack']
    ]
    return leoNodes.position(v, childIndex, stack)


def p_to_ap(p):
    '''Converts Leo position to a serializable archived position.'''
    if not p.v:
        es('app.p_to_ap: no p.v: %r %s' % (p))
        assert False
    p_gnx = p.v.gnx
    if p_gnx not in gnx_to_vnode:
        # print('=== update gnx_to_vnode', p_gnx, p.h)
            # len(list(self.gnx_to_vnode.keys())
        gnx_to_vnode[p_gnx] = p.v
    return {
        'hasBody': bool(p.b),
        'hasChildren': p.hasChildren(),
        'childIndex': p._childIndex,
        'cloned': p.isCloned(),
        'dirty': p.isDirty(),
        'expanded': p.isExpanded(),
        'gnx': p.v.gnx,
        'level': p.level(),
        'headline': p.h,
        'marked': p.isMarked(),
        'stack': [{
            'gnx': stack_v.gnx,
            'childIndex': stack_childIndex,
            'headline': stack_v.h,
        } for (stack_v, stack_childIndex) in p.stack],
    }


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
