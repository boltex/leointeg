import leo.core.leoBridge as leoBridge
import leo.core.leoNodes as leoNodes
import asyncio
import websockets
import sys
import os
import time
import json

# globals
websocketHost = "localhost"
websocketPort = 32125

bridge = leoBridge.controller(gui='nullGui',
                              loadPlugins=False,  # True: attempt to load plugins.
                              readSettings=True,  # True: read standard settings files.
                              silent=True,      # True: don't print signon messages.
                              verbose=False)     # True: print informational messages.

bridgeGlobals = bridge.globals()

currentActionId = 1  # Id of action being processed, STARTS AT 1 = Initial 'ready'

commander = None  # going to store the leo file commander once its opened

gnx_to_vnode = []


def es(p_string):
    '''Emit String Function'''
    print(p_string, flush=True)


def sendLeoBridgePackage(p_key=False, p_any=None):
    global currentActionId
    w_package = {"id": currentActionId}
    if p_key:
        w_package[p_key] = p_any  # add [key]?:any
    return("leoBridge:"+json.dumps(w_package))


def outputBodyData(p_bodyText=""):
    return sendLeoBridgePackage("bodyData", p_bodyText)


def outputPNode(p_node=False):
    if p_node:
        return sendLeoBridgePackage("node", p_to_ap(p_node))  # Single node, singular
        # es("nodeReady"+json.dumps([p_to_ap(p_node)]))  # now convert to JSON as a whole
    else:
        return sendLeoBridgePackage("node", None)
        # es("nodeReady"+json.dumps([]))


def outputPNodes(p_pList):
    w_apList = []
    for p in p_pList:
        w_apList.append(p_to_ap(p))
    return sendLeoBridgePackage("nodes", w_apList)  # Multiple nodes, plural
    # es("outlineDataReady"+json.dumps(w_apList))  # now convert to JSON as a whole


def test(p_param):
    '''Emit a test'''
    global bridgeGlobals, commander
    es('vsCode called test. Hello from leoBridge! your param was: ' + json.dumps(p_param))
    return sendLeoBridgePackage("package", "test string from the response package")
    # for p in commander.all_positions():
    #     if p.h:
    #         outputPNode(p)


def openFile(p_file):
    '''Open a leo file via leoBridge controller'''
    global bridge, commander
    commander = bridge.openLeoFile(p_file)
    if(commander):
        create_gnx_to_vnode()
        return outputPNode(commander.p)
    else:
        es('Error in openFile')
        return('Error in openFile')


def getPNode(p_ap):
    '''EMIT OUT a node, don't select it.'''
    if(p_ap):
        w_p = ap_to_p(p_ap)
        if w_p:
            return outputPNode(w_p)
        else:
            es("Error in getPNode no w_p node found")  # default empty
            return ("Error in getPNode no w_p node found")  # default empty
    else:
        es("Error in getPNode no param p_ap")
        return("Error in getPNode no param p_ap")


def getChildren(p_ap):
    '''EMIT OUT list of children of a node'''
    if(p_ap):
        w_p = ap_to_p(p_ap)
        if w_p and w_p.hasChildren():
            return outputPNodes(w_p.children())
        else:
            return outputPNodes([])  # default empty array
    else:
        return outputPNodes(yieldAllRootChildren())  # this outputs all Root Children


def getParent(p_ap):
    '''EMIT OUT the parent of a node, as an array, even if unique or empty'''
    if(p_ap):
        w_p = ap_to_p(p_ap)
        if w_p and w_p.hasParent():
            return outputPNode(w_p.getParent())
        else:
            return outputPNode()  # default empty for root
    else:
        return outputPNode()


def getSelectedNode(p_param):
    '''EMIT OUT Selected Position as an array, even if unique'''
    global commander
    c = commander
    if(c.p):
        return outputPNode(c.p)
    else:
        return outputPNode()


def getBody(p_gnx):
    '''EMIT OUT body of a node'''
    global commander
    if(p_gnx):
        w_v = commander.fileCommands.gnxDict.get(p_gnx)  # vitalije
        if w_v.b:
            return outputBodyData(w_v.b)
        else:
            return outputBodyData()  # default empty
    else:
        return outputBodyData()  # default empty


def getBodyLength(p_gnx):
    '''EMIT OUT body string length of a node'''
    global commander
    if(p_gnx):
        w_v = commander.fileCommands.gnxDict.get(p_gnx)  # vitalije
        if w_v and len(w_v.b):
            return sendLeoBridgePackage("bodyLenght", len(w_v.b))
        else:
            return sendLeoBridgePackage("bodyLenght", 0)
    else:
        return sendLeoBridgePackage("bodyLenght", 0)


def setNewBody(p_body):
    '''Change Body of selected node'''
    global commander
    if(commander.p):
        commander.p.b = p_body['body']
        return outputPNode(commander.p)
    else:
        es("Error in setNewBody")
        return("Error in setNewBody")


def setBody(p_package):
    '''Change Headline of a node'''
    global commander
    w_v = commander.fileCommands.gnxDict.get(p_package['gnx'])
    w_v.setBodyString(p_package['body'])
    if not w_v.isDirty():
        for w_p in commander.all_positions():
            if w_p.v == w_v:  # found
                w_p.setDirty()
                break
    return sendLeoBridgePackage()  # Just send empty as 'ok'


def setNewHeadline(p_apHeadline):
    '''Change Headline of a node'''
    w_newHeadline = p_apHeadline['headline']
    w_ap = p_apHeadline['node']
    if(w_ap):
        w_p = ap_to_p(w_ap)
        if w_p:
            # set this node's new headline
            w_p.h = w_newHeadline
            return outputPNode(w_p)
    else:
        es("Error in setNewHeadline")
        return("Error in setNewHeadline")


def setSelectedNode(p_ap):
    '''Select a node'''
    global commander
    if(p_ap):
        w_p = ap_to_p(p_ap)
        if w_p:
            # set this node as selection
            commander.selectPosition(w_p)
    return sendLeoBridgePackage()  # Just send empty as 'ok'


def expandNode(p_ap):
    '''Expand a node'''
    if(p_ap):
        w_p = ap_to_p(p_ap)
        if w_p:
            w_p.expand()
    return sendLeoBridgePackage()  # Just send empty as 'ok'


def collapseNode(p_ap):
    '''Collapse a node'''
    if(p_ap):
        w_p = ap_to_p(p_ap)
        if w_p:
            w_p.contract()
    return sendLeoBridgePackage()  # Just send empty as 'ok'


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


def yieldAllRootChildren():
    '''Return all root children P nodes'''
    global commander
    p = commander.rootPosition()
    while p:
        yield p
        p.moveToNext()


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
    # TODO : (MAYBE) Convert all those bools in an integer : 'status' Flags
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


def processCommand(p_string):
    '''Process incoming command'''
    global currentActionId
    p_string = p_string.strip()
    if p_string.startswith("leoBridge:"):
        w_param = json.loads(p_string[10:])
        if w_param and w_param['action']:
            # * Storing id of action in global var instead of passing as parameter
            currentActionId = w_param['id']
            return globals()[w_param['action']](w_param['param'])
        else:
            return("Error in processCommand")
        return
    if p_string:
        es('from vscode' + p_string)  # NOT REOCOGNIZED : Emit if not an empty string


def main():
    '''python script for leo integration via leoBridge'''
    global websocketHost, websocketPort
    sys.stdin = os.fdopen(sys.stdin.fileno(), 'r')
    es("Starting leobridge server... [ctrl+c] to break")

    async def leoBridgeServer(websocket, path):
        await websocket.send(sendLeoBridgePackage())  # Just send empty as 'ok'
        async for message in websocket:
            message = processCommand(message)  # Process entry from stdin(message)
            await websocket.send(message)

    start_server = websockets.serve(leoBridgeServer, websocketHost, websocketPort)

    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()


# Startup
if __name__ == '__main__':
    main()
