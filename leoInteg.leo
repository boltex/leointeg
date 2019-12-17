<?xml version="1.0" encoding="utf-8"?>
<!-- Created by Leo: http://leoeditor.com/leo_toc.html -->
<leo_file xmlns:leo="http://leoeditor.com/namespaces/leo-python-editor/1.1" >
<leo_header file_format="2"/>
<globals/>
<preferences/>
<find_panel_settings/>
<vnodes>
<v t="felix.20190922171916.2"><vh>Introduction</vh></v>
<v t="felix.20191126232434.2"><vh>@clean leobridgeserver.py</vh>
<v t="felix.20191128002414.1"><vh>Imports</vh></v>
<v t="felix.20191128002417.1"><vh>Constants</vh></v>
<v t="felix.20191126232434.4"><vh>class leoBridgeIntegController</vh>
<v t="felix.20191126232434.5"><vh>__init__</vh></v>
<v t="felix.20191126232434.12"><vh>test</vh></v>
<v t="felix.20191126232434.13"><vh>openFile</vh></v>
<v t="felix.20191126232434.14"><vh>closeFile</vh></v>
<v t="felix.20191128003151.1"><vh>JSON Output Functions</vh>
<v t="felix.20191128004456.1"><vh>setActionId</vh></v>
<v t="felix.20191126232434.7"><vh>sendLeoBridgePackage</vh></v>
<v t="felix.20191126232434.8"><vh>outputError</vh></v>
<v t="felix.20191126232434.9"><vh>outputBodyData</vh></v>
<v t="felix.20191126232434.10"><vh>outputPNode</vh></v>
<v t="felix.20191126232434.11"><vh>outputPNodes</vh></v>
</v>
<v t="felix.20191128000818.1"><vh>Outline Edition Commands</vh>
<v t="felix.20191127004621.1"><vh>markPNode</vh></v>
<v t="felix.20191127235913.1"><vh>unmarkPNode</vh></v>
<v t="felix.20191127004619.1"><vh>copyPNode</vh></v>
<v t="felix.20191127004620.1"><vh>cutPNode</vh></v>
<v t="felix.20191130211048.1"><vh>pastePNode</vh></v>
<v t="felix.20191130211048.2"><vh>pasteAsClonePNode</vh></v>
<v t="felix.20191127002548.1"><vh>deletePNode</vh></v>
<v t="felix.20191127000344.1"><vh>movePNodeDown</vh></v>
<v t="felix.20191127000419.1"><vh>movePNodeLeft</vh></v>
<v t="felix.20191127000420.1"><vh>movePNodeRight</vh></v>
<v t="felix.20191127000420.2"><vh>movePNodeUp</vh></v>
<v t="felix.20191127001506.1"><vh>insertPNode</vh></v>
<v t="felix.20191127001502.1"><vh>clonePNode</vh></v>
<v t="felix.20191127001506.2"><vh>promotePNode</vh></v>
<v t="felix.20191127001506.3"><vh>demotePNode</vh></v>
</v>
<v t="felix.20191128001054.1"><vh>Outline and Body Interaction</vh>
<v t="felix.20191126232434.15"><vh>getPNode</vh></v>
<v t="felix.20191126232434.16"><vh>getChildren</vh></v>
<v t="felix.20191126232434.17"><vh>getParent</vh></v>
<v t="felix.20191126232434.18"><vh>getSelectedNode</vh></v>
<v t="felix.20191201194046.1"><vh>getAllGnx</vh></v>
<v t="felix.20191126232434.19"><vh>getBody</vh></v>
<v t="felix.20191126232434.20"><vh>getBodyLength</vh></v>
<v t="felix.20191126232434.21"><vh>setNewBody</vh></v>
<v t="felix.20191126232434.22"><vh>setBody</vh></v>
<v t="felix.20191126232434.23"><vh>setNewHeadline</vh></v>
<v t="felix.20191126232434.24"><vh>setSelectedNode</vh></v>
<v t="felix.20191126232434.25"><vh>expandNode</vh></v>
<v t="felix.20191126232434.26"><vh>collapseNode</vh></v>
<v t="felix.20191126232434.29"><vh>yieldAllRootChildren</vh></v>
<v t="felix.20191216195906.1"><vh>findPNodeFromGnx</vh></v>
</v>
<v t="felix.20191128003648.1"><vh>leoFlexx Conversion Functions</vh>
<v t="felix.20191126232434.27"><vh>create_gnx_to_vnode</vh></v>
<v t="felix.20191126232434.28"><vh>test_round_trip_positions</vh></v>
<v t="felix.20191126232434.30"><vh>ap_to_p</vh></v>
<v t="felix.20191126232434.31"><vh>p_to_ap</vh></v>
</v>
</v>
<v t="felix.20191126232435.1"><vh>main</vh></v>
</v>
</vnodes>
<tnodes>
<t tx="felix.20190922171916.2">I should have started self documentation here from the start in august! 
todo: flesh this out!</t>
<t tx="felix.20191126232434.10">def outputPNode(self, p_node=False):
    if p_node:
        return self.sendLeoBridgePackage("node", self.p_to_ap(p_node))  # Single node, singular
    else:
        return self.sendLeoBridgePackage("node", None)

</t>
<t tx="felix.20191126232434.11">def outputPNodes(self, p_pList):
    w_apList = []
    for p in p_pList:
        w_apList.append(self.p_to_ap(p))
    return self.sendLeoBridgePackage("nodes", w_apList)  # Multiple nodes, plural

</t>
<t tx="felix.20191126232434.12">def test(self, p_param):
    '''Emit a test'''
    print('vsCode called test. Hello from leoBridge! your param was: ' + json.dumps(p_param, separators=(',', ':')))
    return self.sendLeoBridgePackage("package", "test string from the response package")

</t>
<t tx="felix.20191126232434.13">def openFile(self, p_file):
    '''Open a leo file via leoBridge controller'''
    print("Trying to open file: "+p_file)
    self.commander = self.bridge.openLeoFile(p_file)  # create self.commander
    if(self.commander):
        self.create_gnx_to_vnode()
        return self.outputPNode(self.commander.p)
    else:
        return self.outputError('Error in openFile')

</t>
<t tx="felix.20191126232434.14">def closeFile(self):
    '''Closes a leo file. A file can then be opened with "openFile"'''
    print("Trying to close opened file")
    if(self.commander):
        self.commander.close()
    return self.sendLeoBridgePackage()  # Just send empty as 'ok'

</t>
<t tx="felix.20191126232434.15">def getPNode(self, p_ap):
    '''EMIT OUT a node, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            return self.outputPNode(w_p)
        else:
            return self.outputError("Error in getPNode no w_p node found")
    else:
        return self.outputError("Error in getPNode no param p_ap")

</t>
<t tx="felix.20191126232434.16">def getChildren(self, p_ap):
    '''EMIT OUT list of children of a node'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        # print('Get children for ' + w_p.h)
        if w_p and w_p.hasChildren():
            return self.outputPNodes(w_p.children())
        else:
            return self.outputPNodes([])  # default empty array
    else:
        return self.outputPNodes(self.yieldAllRootChildren())  # this outputs all Root Children

</t>
<t tx="felix.20191126232434.17">def getParent(self, p_ap):
    '''EMIT OUT the parent of a node, as an array, even if unique or empty'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p and w_p.hasParent():
            return self.outputPNode(w_p.getParent())
        else:
            return self.outputPNode()  # default empty for root
    else:
        return self.outputPNode()

</t>
<t tx="felix.20191126232434.18">def getSelectedNode(self, p_paramUnused):
    '''EMIT OUT Selected Position as an array, even if unique'''
    if(self.commander.p):
        return self.outputPNode(self.commander.p)
    else:
        return self.outputPNode()

</t>
<t tx="felix.20191126232434.19">def getBody(self, p_gnx):
    '''EMIT OUT body of a node'''
    if(p_gnx):
        w_v = self.commander.fileCommands.gnxDict.get(p_gnx)  # vitalije
        if w_v:
            if w_v.b:
                return self.outputBodyData(w_v.b)
            else:
                return self.outputBodyData()  # default "" empty string
        else:
            return self.sendLeoBridgePackage()  # empty as inexistent
    else:
        return self.sendLeoBridgePackage()  # empty as inexistent

</t>
<t tx="felix.20191126232434.2">#! python3
@language python
@tabwidth -4
@others
if __name__ == '__main__':
    # Startup
    try:
        main()
    except KeyboardInterrupt:
        print("\nKeyboard Interupt: Stopping leobridge server")
        sys.exit()
</t>
<t tx="felix.20191126232434.20">def getBodyLength(self, p_gnx):
    '''EMIT OUT body string length of a node'''
    if(p_gnx):
        w_v = self.commander.fileCommands.gnxDict.get(p_gnx)  # vitalije
        if w_v and len(w_v.b):
            return self.sendLeoBridgePackage("bodyLength", len(w_v.b))
        else:
            return self.sendLeoBridgePackage("bodyLength", 0)
    else:
        # TODO : May need to signal inexistent by self.sendLeoBridgePackage()  # empty as inexistent
        return self.sendLeoBridgePackage("bodyLength", 0)

</t>
<t tx="felix.20191126232434.21">def setNewBody(self, p_body):
    '''Change Body of selected node'''
    if(self.commander.p):
        self.commander.p.b = p_body['body']
        return self.outputPNode(self.commander.p)
    else:
        return self.outputError("Error in setNewBody")

</t>
<t tx="felix.20191126232434.22">def setBody(self, p_package):
    '''Change Body text of a node'''
    w_v = self.commander.fileCommands.gnxDict.get(p_package['gnx'])
    w_v.setBodyString(p_package['body'])
    if not w_v.isDirty():
        for w_p in self.commander.all_positions():
            if w_p.v == w_v:  # found
                w_p.setDirty()
                break
    return self.sendLeoBridgePackage()  # Just send empty as 'ok'

</t>
<t tx="felix.20191126232434.23">def setNewHeadline(self, p_apHeadline):
    '''Change Headline of a node'''
    w_newHeadline = p_apHeadline['headline']
    w_ap = p_apHeadline['node']
    if(w_ap):
        w_p = self.ap_to_p(w_ap)
        if w_p:
            # set this node's new headline
            w_p.h = w_newHeadline
            return self.outputPNode(w_p)
    else:
        return self.outputError("Error in setNewHeadline")

</t>
<t tx="felix.20191126232434.24">def setSelectedNode(self, p_ap):
    '''Select a node'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            if self.commander.positionExists(w_p):
                # set this node as selection
                self.commander.selectPosition(w_p)
            else:
                w_foundPNode = self.findPNodeFromGnx(p_ap['gnx'])
                if w_foundPNode:
                    print("got first p node with gnx: "+ p_ap['gnx'])
                    self.commander.selectPosition(foundPNode)
                else:
                    print("Set Selection node does not exist! ap was:" + json.dumps(p_ap))
    # return self.sendLeoBridgePackage()  # Just send empty as 'ok'
    # * return the finally selected node instead
    if(self.commander.p):
        return self.outputPNode(self.commander.p)
    else:
        return self.outputPNode()

</t>
<t tx="felix.20191126232434.25">def expandNode(self, p_ap):
    '''Expand a node'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            w_p.expand()
    return self.sendLeoBridgePackage()  # Just send empty as 'ok'

</t>
<t tx="felix.20191126232434.26">def collapseNode(self, p_ap):
    '''Collapse a node'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            w_p.contract()
    return self.sendLeoBridgePackage()  # Just send empty as 'ok'

</t>
<t tx="felix.20191126232434.27">def create_gnx_to_vnode(self):
    '''Make the first gnx_to_vnode array with all unique nodes'''

    t1 = time.process_time()
    self.gnx_to_vnode = {v.gnx: v for v in self.commander.all_unique_nodes()}
    # This is likely the only data that ever will be needed.
    if 0:
        print('app.create_all_data: %5.3f sec. %s entries' % (
            (time.process_time()-t1), len(list(self.gnx_to_vnode.keys()))))
    self.test_round_trip_positions()

</t>
<t tx="felix.20191126232434.28">def test_round_trip_positions(self):
    '''(From Leo plugin leoflexx.py) Test the round tripping of p_to_ap and ap_to_p.'''
    # Bug fix: p_to_ap updates app.gnx_to_vnode. Save and restore it.
    old_d = self.gnx_to_vnode.copy()
    old_len = len(list(self.gnx_to_vnode.keys()))
    t1 = time.process_time()
    qtyAllPositions = 0
    for p in self.commander.all_positions():
        qtyAllPositions += 1
        ap = self.p_to_ap(p)
        p2 = self.ap_to_p(ap)
        assert p == p2, (repr(p), repr(p2), repr(ap))
    gnx_to_vnode = old_d
    new_len = len(list(gnx_to_vnode.keys()))
    assert old_len == new_len, (old_len, new_len)
    print('Leo file opened. Its outline contains ' + str(qtyAllPositions) + " nodes positions.")
    print(('Testing app.test_round_trip_positions for all nodes: Total time: %5.3f sec.' % (time.process_time()-t1)))

</t>
<t tx="felix.20191126232434.29">def yieldAllRootChildren(self):
    '''Return all root children P nodes'''
    p = self.commander.rootPosition()
    while p:
        yield p
        p.moveToNext()

</t>
<t tx="felix.20191126232434.30">def ap_to_p(self, ap):
    '''(From Leo plugin leoflexx.py) Convert an archived position to a true Leo position.'''
    childIndex = ap['childIndex']
    v = self.gnx_to_vnode[ap['gnx']]
    stack = [
        (self.gnx_to_vnode[d['gnx']], d['childIndex'])
        for d in ap['stack']
    ]
    return leoNodes.position(v, childIndex, stack)

</t>
<t tx="felix.20191126232434.31">def p_to_ap(self, p):
    '''(From Leo plugin leoflexx.py) Converts Leo position to a serializable archived position.'''
    if not p.v:
        print('app.p_to_ap: no p.v: %r %s' % (p))
        assert False
    p_gnx = p.v.gnx
    if p_gnx not in self.gnx_to_vnode:
        self.gnx_to_vnode[p_gnx] = p.v
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
    # TODO : (MAYBE) Convert all those booleans into an integer 'status' Flags
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
    if p == self.commander.p:
        w_ap['selected'] = True
    return w_ap


</t>
<t tx="felix.20191126232434.4">class leoBridgeIntegController:
    '''Leo Bridge Controller'''

    @others
</t>
<t tx="felix.20191126232434.5">def __init__(self):
    self.gnx_to_vnode = []  # utility array - see leoflexx.py in leoPluginsRef.leo
    self.bridge = leoBridge.controller(gui='nullGui',
                                       loadPlugins=False,  # True: attempt to load plugins.
                                       readSettings=True,  # True: read standard settings files.
                                       silent=True,      # True: don't print signon messages.
                                       verbose=False)     # True: print informational messages.
    self.currentActionId = 1  # Id of action being processed, STARTS AT 1 = Initial 'ready'
    # self.commander = None  # going to store the leo file commander once its opened from leo.core.leoBridge

</t>
<t tx="felix.20191126232434.7">def sendLeoBridgePackage(self, p_key=False, p_any=None):
    w_package = {"id": self.currentActionId}
    if p_key:
        w_package[p_key] = p_any  # add [key]?:any
    return(json.dumps(w_package, separators=(',', ':')))  # send as json

</t>
<t tx="felix.20191126232434.8">def outputError(self, p_message="Unknown Error"):
    print("ERROR: " + p_message)  # Output to this server's running console
    w_package = {"id": self.currentActionId}
    w_package["error"] = p_message
    return p_message

</t>
<t tx="felix.20191126232434.9">def outputBodyData(self, p_bodyText=""):
    return self.sendLeoBridgePackage("bodyData", p_bodyText)

</t>
<t tx="felix.20191126232435.1">def main():
    '''python script for leo integration via leoBridge'''
    global wsHost, wsPort

    # replace default host address and port if provided as arguments

    try:
        opts, args = getopt.getopt(sys.argv[1:], "ha:p:", ["help", "address=", "port="])
    except getopt.GetoptError:
        print('leobridgeserver.py -a &lt;address&gt; -p &lt;port&gt;')
        print('defaults to localhost on port 32125')
        if args:
            print("unused args: " + str(args))
        sys.exit(2)
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            print('leobridgeserver.py -a &lt;address&gt; -p &lt;port&gt;')
            print('defaults to localhost on port 32125')
            sys.exit()
        elif opt in ("-a", "--address"):
            wsHost = arg
        elif opt in ("-p", "--port"):
            wsPort = arg

    # start Server

    integController = leoBridgeIntegController()

    # TODO : This is a basic test loop, fix it with 2 way async comm and error checking
    async def leoBridgeServer(websocket, path):
        try:
            await websocket.send(integController.sendLeoBridgePackage())  # * Start by sending empty as 'ok'
            async for w_message in websocket:
                w_param = json.loads(w_message)
                if w_param and w_param['action']:
                    # print("action:" + w_param['action'])
                    # * Storing id of action in global var instead of passing as parameter
                    integController.setActionId(w_param['id'])
                    # ! functions called this way need to accept at least a parameter other than 'self'
                    # ! See : getSelectedNode and getAllGnx
                    answer = getattr(integController, w_param['action'])(w_param['param'])
                else:
                    print("Error in processCommand")
                await websocket.send(answer)
        except:
            print("Caught Websocket Disconnect Event")
        finally:
            asyncio.get_event_loop().stop()

    start_server = websockets.serve(leoBridgeServer, wsHost, wsPort)

    asyncio.get_event_loop().run_until_complete(start_server)
    print("LeoBridge started at " + wsHost + " on port: " + str(wsPort) + " [ctrl+c] to break", flush=True)
    asyncio.get_event_loop().run_forever()
    print("Stopping leobridge server")


</t>
<t tx="felix.20191127000344.1">def movePNodeDown(self, p_ap):
    '''Move a node DOWN, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            return self.sendLeoBridgePackage()  # Just send empty as 'ok'
            # return self.outputPNode(w_p)
        else:
            return self.outputError("Error in movePNodeDown no w_p node found")  # default empty
    else:
        return self.outputError("Error in movePNodeDown no param p_ap")

</t>
<t tx="felix.20191127000419.1">def movePNodeLeft(self, p_ap):
    '''Move a node LEFT, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            return self.sendLeoBridgePackage()  # Just send empty as 'ok'
            # return self.outputPNode(w_p)
        else:
            return self.outputError("Error in movePNodeLeft no w_p node found")  # default empty
    else:
        return self.outputError("Error in movePNodeLeft no param p_ap")

</t>
<t tx="felix.20191127000420.1">def movePNodeRight(self, p_ap):
    '''Move a node RIGHT, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            return self.sendLeoBridgePackage()  # Just send empty as 'ok'
            # return self.outputPNode(w_p)
        else:
            return self.outputError("Error in movePNodeRight no w_p node found")  # default empty
    else:
        return self.outputError("Error in movePNodeRight no param p_ap")

</t>
<t tx="felix.20191127000420.2">def movePNodeUp(self, p_ap):
    '''Move a node UP, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            return self.sendLeoBridgePackage()  # Just send empty as 'ok'
            # return self.outputPNode(w_p)
        else:
            return self.outputError("Error in movePNodeUp no w_p node found")  # default empty
    else:
        return self.outputError("Error in movePNodeUp no param p_ap")

</t>
<t tx="felix.20191127001502.1">def clonePNode(self, p_ap):
    '''Clone a node, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            return self.sendLeoBridgePackage()  # Just send empty as 'ok'
            # return self.outputPNode(w_p)
        else:
            return self.outputError("Error in clonePNode no w_p node found")  # default empty
    else:
        return self.outputError("Error in clonePNode no param p_ap")

</t>
<t tx="felix.20191127001506.1">def insertPNode(self, p_ap):
    '''Insert a node, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            return self.sendLeoBridgePackage()  # Just send empty as 'ok'
            # return self.outputPNode(w_p)
        else:
            return self.outputError("Error in insertPNode no w_p node found")  # default empty
    else:
        return self.outputError("Error in insertPNode no param p_ap")

</t>
<t tx="felix.20191127001506.2">def promotePNode(self, p_ap):
    '''Promote a node, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            return self.sendLeoBridgePackage()  # Just send empty as 'ok'
            # return self.outputPNode(w_p)
        else:
            return self.outputError("Error in promotePNode no w_p node found")  # default empty
    else:
        return self.outputError("Error in promotePNode no param p_ap")

</t>
<t tx="felix.20191127001506.3">def demotePNode(self, p_ap):
    '''EMIT OUT a node, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            return self.sendLeoBridgePackage()  # Just send empty as 'ok'
            # return self.outputPNode(w_p)
        else:
            return self.outputError("Error in demotePNode no w_p node found")  # default empty
    else:
        return self.outputError("Error in demotePNode no param p_ap")

</t>
<t tx="felix.20191127002548.1">def deletePNode(self, p_ap):
    '''Delete a node, don't select it. Try to keep selection, then return the selected node that remains'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            if w_p == self.commander.p:
                # print("already on selection")
                self.commander.deleteOutline()  # already on this node, so delete it
            else:
                # print("not on selection")
                oldPosition = self.commander.p  # not same node, save position to possibly return to
                self.commander.selectPosition(w_p)
                self.commander.deleteOutline()
                if self.commander.positionExists(oldPosition):
                    self.commander.selectPosition(oldPosition)  # select if old position still valid
                else:
                    oldPosition._childIndex = oldPosition._childIndex-1
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # try with lowered childIndex

            # print("finally returning node" + self.commander.p.v.headString())
            return self.outputPNode(self.commander.p)  # in both cases, return selected node
        else:
            return self.outputError("Error in deletePNode no w_p node found")  # default empty
    else:
        return self.outputError("Error in deletePNode no param p_ap")

</t>
<t tx="felix.20191127004619.1">def copyPNode(self, p_ap):
    '''Copy a node, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            # self.clipboard = self.commander.fileCommands.putLeoOutline(w_p) # Replace clipboard
            self.commander.copyOutline()
            return self.sendLeoBridgePackage()  # Just send empty as 'ok'
        else:
            return self.outputError("Error in copyPNode no w_p node found")
    else:
        return self.outputError("Error in copyPNode no param p_ap")

</t>
<t tx="felix.20191127004620.1">def cutPNode(self, p_ap):
    '''Cut a node, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            self.commander.cutOutline()
            return self.sendLeoBridgePackage()  # Just send empty as 'ok'
        else:
            return self.outputError("Error in cutPNode no w_p node found")  # default empty
    else:
        return self.outputError("Error in cutPNode no param p_ap")

</t>
<t tx="felix.20191127004621.1">def markPNode(self, p_ap):
    '''Mark a node, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            w_p.setMarked()
            return self.sendLeoBridgePackage()  # Just send empty as 'ok'
        else:
            return self.outputError("Error in markPNode no w_p node found")
    else:
        return self.outputError("Error in markPNode no param p_ap")

</t>
<t tx="felix.20191127235913.1">def unmarkPNode(self, p_ap):
    '''Unmark a node, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            w_p.clearMarked()
            return self.sendLeoBridgePackage()  # Just send empty as 'ok'
        else:
            return self.outputError("Error in unmarkPNode no w_p node found")
    else:
        return self.outputError("Error in unmarkPNode no param p_ap")

</t>
<t tx="felix.20191128000818.1">@others
</t>
<t tx="felix.20191128001054.1">@others
</t>
<t tx="felix.20191128002414.1">import leo.core.leoBridge as leoBridge
import leo.core.leoNodes as leoNodes
import asyncio
import websockets
import sys
import getopt
import os
import time
import json

</t>
<t tx="felix.20191128002417.1"># server defaults
wsHost = "localhost"
wsPort = 32125


</t>
<t tx="felix.20191128003151.1">@others
</t>
<t tx="felix.20191128003648.1">@others
</t>
<t tx="felix.20191128004456.1">def setActionId(self, p_id):
    self.currentActionId = p_id

</t>
<t tx="felix.20191130211048.1">def pastePNode(self, p_ap):
    '''Paste a node, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            return self.sendLeoBridgePackage()  # Just send empty as 'ok'
            # return self.outputPNode(w_p)
        else:
            return self.outputError("Error in pastePNode no w_p node found")  # default empty
    else:
        return self.outputError("Error in pastePNode no param p_ap")

</t>
<t tx="felix.20191130211048.2">def pasteAsClonePNode(self, p_ap):
    '''Paste as clone, don't select it.'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            return self.sendLeoBridgePackage()  # Just send empty as 'ok'
            # return self.outputPNode(w_p)
        else:
            return self.outputError("Error in pasteAsClonePNode no w_p node found")  # default empty
    else:
        return self.outputError("Error in pasteAsClonePNode no param p_ap")

</t>
<t tx="felix.20191201194046.1">def getAllGnx(self, p_paramUnused):
    '''Get gnx array from all unique nodes'''
    w_all_gnx = [p.v.gnx for p in self.commander.all_unique_positions(copy=False)]
    return self.sendLeoBridgePackage("allGnx", w_all_gnx)

</t>
<t tx="felix.20191216195906.1">def findPNodeFromGnx(self, p_gnx):
    '''Return first p node with this gnx or false'''
    for p in self.commander.all_unique_positions():
        if p.v.gnx == p_gnx:
            return p
    return False

</t>
</tnodes>
</leo_file>
