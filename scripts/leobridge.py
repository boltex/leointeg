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
    '''Emit String Function'''
    print(p_string, flush=True)


def dumpPNodes(p_pList):
    w_apList = []
    for p in p_pList:
        w_apList.append(p_to_ap(p))
    es("dumpPNodes"+json.dumps(w_apList))  # now convert to JSON as a whole


def outputBodyData(p_bodyText):
    if p_bodyText:
        es("bodyDataReady"+json.dumps({'body': p_bodyText}))
    else:
        es("bodyDataReady"+json.dumps({'body': ""}))


def outputPNode(p_node):
    if p_node:
        es("nodeReady"+json.dumps([p_to_ap(p_node)]))  # now convert to JSON as a whole
    else:
        es("nodeReady"+json.dumps([]))


def outputOutlineData(p_pList):
    w_apList = []
    for p in p_pList:
        w_apList.append(p_to_ap(p))
    es("outlineDataReady"+json.dumps(w_apList))  # now convert to JSON as a whole


def outputTest():
    '''Emit a test'''
    global bridgeGlobals, commander
    es('vsCode called test. Hello from leoBridge!')
    # for p in commander.all_positions():
    #     if p.h:
    #         outputPNode(p)


def openFile(p_file):
    '''Open a leo file via leoBridge controller'''
    global bridge, commander
    commander = bridge.openLeoFile(p_file)
    if(commander):
        create_gnx_to_vnode()

        dumpPNodes([commander.p])
        # Sending FILEREADY CODE
        es("fileOpenedReady")


def getAllRootChildren():
    '''EMIT OUT list of all root nodes'''
    global commander
    p = commander.rootPosition()
    while p:
        yield p
        p.moveToNext()


def getChildren(p_apJson):
    '''EMIT OUT list of children of a node'''
    if(p_apJson):
        w_p = ap_to_p(json.loads(p_apJson))
        if w_p and w_p.hasChildren():
            outputOutlineData(w_p.children())
        else:
            outputOutlineData([])  # default empty
    else:
        outputOutlineData(getAllRootChildren())


def getParent(p_apJson):
    '''EMIT OUT the parent of a node, as an array, even if unique or empty'''
    if(p_apJson):
        w_p = ap_to_p(json.loads(p_apJson))
        if w_p and w_p.hasParent():
            outputPNode(w_p.getParent())
        else:
            outputPNode(False)  # default empty for root
    else:
        outputPNode(False)


def getSelectedNode():
    '''EMIT OUT Selected Position as an array, even if unique'''
    global commander
    c = commander
    if(c.p):
        outputPNode(c.p)
    else:
        outputPNode(False)


def getBody(p_apJson):
    '''EMIT OUT body of a node'''
    if(p_apJson):
        w_p = ap_to_p(json.loads(p_apJson))
        if w_p and w_p.b:
            outputBodyData(w_p.b)
        else:
            outputBodyData(False)  # default empty
    else:
        outputBodyData(False)


def setNewBody(p_bodyJson):
    '''Change Body of selected node'''
    global commander
    w_body = json.loads(p_bodyJson)
    if(commander.p):
        commander.p.b = w_body['body']
        outputPNode(commander.p)
    else:
        es("error in setNewBody")


def setNewHeadline(p_apHeadlineJson):
    '''Change Headline of a node'''
    global commander
    w_apHeadline = json.loads(p_apHeadlineJson)
    w_newHeadline = w_apHeadline['headline']
    w_ap = w_apHeadline['node']
    if(w_ap):
        w_p = ap_to_p(w_ap)
        if w_p:
            # set this node's new headline
            w_p.h = w_newHeadline
            outputPNode(w_p)
    else:
        es("error in setNewHeadline")


def setSelectedNode(p_apJson):
    '''Select a node'''
    global commander
    if(p_apJson):
        w_p = ap_to_p(json.loads(p_apJson))
        if w_p:
            # set this node as selection
            commander.selectPosition(w_p)
    es('selectionReady')


def processLeoBridge(p_paramJson):
    '''Process incoming command'''
    es(p_paramJson)
    getSelectedNode()


def processCommand(p_string):
    '''Process incoming command'''
    p_string = p_string.strip()
    if p_string == "test":
        outputTest()
        return
    if p_string.startswith("leoBridge:"):
        processLeoBridge(p_string[10:])  # TEST OF LEOBRIDGE GENERAL FUNCTION
        return
    if p_string.startswith("openFile:"):
        openFile(p_string[9:])  # open file : rest of line as parameter
        return
    if p_string.startswith("getSelectedNode:"):
        getSelectedNode()  # get selected node in an array : no parameter
        return
    if p_string.startswith("getChildren:"):
        getChildren(p_string[12:])  # get child array : rest of line as parameter
        return
    if p_string.startswith("setSelectedNode:"):
        setSelectedNode(p_string[16:])  # set the currently selected node : rest of line as parameter
        return
    if p_string.startswith("getParent:"):
        getParent(p_string[10:])  # get single parent or none, as an array : rest of line as parameter
        return
    if p_string.startswith("getBody:"):
        getBody(p_string[8:])  # get body of node : rest of line as parameter
        return
    if p_string.startswith("setNewBody:"):
        setNewBody(p_string[11:])  # change node to new headline : rest of line as parameter
        return
    if p_string.startswith("setNewHeadline:"):
        setNewHeadline(p_string[15:])  # change node to new headline : rest of line as parameter
        return
    # If still in this function then unkown command was sent
    if p_string:
        es('from vscode'+p_string)  # Emit if not an empty string


def create_gnx_to_vnode():
    '''Make the first gnx_to_vnode array with all unique nodes'''
    global gnx_to_vnode, commander
    t1 = time.clock()
    gnx_to_vnode = {v.gnx: v for v in commander.all_unique_nodes()}
    # This is likely the only data that ever will be needed.
    if 0:
        es('app.create_all_data: %5.3f sec. %s entries' % (
            (time.clock()-t1), len(list(gnx_to_vnode.keys()))))
    test_round_trip_positions()


def test_round_trip_positions():
    '''(From Leo plugin leoflexx.py) Test the round tripping of p_to_ap and ap_to_p.'''
    global gnx_to_vnode, commander
    c = commander
    # Bug fix: p_to_ap updates app.gnx_to_vnode. Save and restore it.
    old_d = gnx_to_vnode.copy()
    old_len = len(list(gnx_to_vnode.keys()))
    t1 = time.clock()
    qtyAllPositions = 0
    for p in c.all_positions():
        qtyAllPositions += 1
        ap = p_to_ap(p)
        p2 = ap_to_p(ap)
        assert p == p2, (repr(p), repr(p2), repr(ap))
    gnx_to_vnode = old_d
    new_len = len(list(gnx_to_vnode.keys()))
    assert old_len == new_len, (old_len, new_len)
    es('qtyAllPositions : ' + str(qtyAllPositions))
    es(('app.test_round_trip_positions: %5.3f sec for nodes total: ' % (time.clock()-t1))+str(qtyAllPositions))


def ap_to_p(ap):
    '''(From Leo plugin leoflexx.py) Convert an archived position to a true Leo position.'''
    global gnx_to_vnode
    childIndex = ap['childIndex']
    v = gnx_to_vnode[ap['gnx']]
    stack = [
        (gnx_to_vnode[d['gnx']], d['childIndex'])
        for d in ap['stack']
    ]
    return leoNodes.position(v, childIndex, stack)


def p_to_ap(p):
    '''(From Leo plugin leoflexx.py) Converts Leo position to a serializable archived position.'''
    global commander, gnx_to_vnode
    if not p.v:
        es('app.p_to_ap: no p.v: %r %s' % (p))
        assert False
    p_gnx = p.v.gnx
    if p_gnx not in gnx_to_vnode:
        gnx_to_vnode[p_gnx] = p.v
    # * necessary properties for outline
    w_ap = {
        'childIndex': p._childIndex,
        'gnx': p.v.gnx,
        'level': p.level(),
        'headline': p.h,
        'stack': [{
            'gnx': stack_v.gnx,
            'childIndex': stack_childIndex,
            'headline': stack_v.h,
        } for (stack_v, stack_childIndex) in p.stack],
    }
    if bool(p.b):
        w_ap['hasBody'] = True
    if p.hasChildren():
        w_ap['hasChildren'] = True
    if p.isCloned():
        w_ap['cloned'] = True
    if p.isDirty():
        w_ap['dirty'] = True
    if p.isExpanded():
        w_ap['expanded'] = True
    if p.isMarked():
        w_ap['marked'] = True
    if p == commander.p:
        w_ap['selected'] = True
    return w_ap


def main():
    '''python script for leo integration via leoBridge'''
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
