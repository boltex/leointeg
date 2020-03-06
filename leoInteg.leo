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
<v t="felix.20200302204251.1"><vh>class IdleTimeManager</vh>
<v t="felix.20200302204251.2"><vh>itm.add_callback</vh></v>
<v t="felix.20200302204251.3"><vh>itm.on_idle</vh></v>
<v t="felix.20200302204251.4"><vh>itm.start</vh></v>
</v>
<v t="felix.20200302205810.1"><vh>class ExternalFilesController</vh>
<v t="felix.20200302205810.2"><vh>efc.ctor</vh></v>
<v t="felix.20200302205810.7"><vh>efc.on_idle</vh></v>
<v t="felix.20200302205810.8"><vh>efc.idle_check_commander</vh></v>
<v t="felix.20200302205810.9"><vh>efc.idle_check_at_file_node</vh></v>
<v t="felix.20200304221925.1"><vh>efc.integResult</vh></v>
<v t="felix.20200302205810.21"><vh>efc.utilities</vh>
<v t="felix.20200302205810.22"><vh>efc.ask</vh></v>
<v t="felix.20200302205810.23"><vh>efc.checksum</vh></v>
<v t="felix.20200302205810.25"><vh>efc.get_mtime</vh></v>
<v t="felix.20200302205810.26"><vh>efc.get_time</vh></v>
<v t="felix.20200302205810.27"><vh>efc.has_changed</vh></v>
<v t="felix.20200302205810.28"><vh>efc.is_enabled</vh></v>
<v t="felix.20200302205810.29"><vh>efc.join</vh></v>
<v t="felix.20200302205810.30"><vh>efc.set_time</vh></v>
<v t="felix.20200302205810.31"><vh>efc.warn</vh></v>
</v>
</v>
<v t="felix.20191126232434.4"><vh>class leoBridgeIntegController</vh>
<v t="felix.20191126232434.5"><vh>__init__</vh></v>
<v t="felix.20200303211848.1"><vh>_commanders</vh></v>
<v t="felix.20200303214235.1"><vh>_asyncIdleLoop</vh></v>
<v t="felix.20200303214255.1"><vh>_idleTime</vh></v>
<v t="felix.20200304224909.1"><vh>sendAsyncOutput</vh></v>
<v t="felix.20200304220844.1"><vh>askResult</vh></v>
<v t="felix.20200219224515.1"><vh>logSignon</vh></v>
<v t="felix.20200219222712.1"><vh>es</vh></v>
<v t="felix.20200211202929.1"><vh>initConnection</vh></v>
<v t="felix.20191126232434.13"><vh>openFile</vh></v>
<v t="felix.20191126232434.14"><vh>closeFile</vh></v>
<v t="felix.20200216160305.1"><vh>saveFile</vh></v>
<v t="felix.20191128003151.1"><vh>JSON Output Functions</vh>
<v t="felix.20191128004456.1"><vh>setActionId</vh></v>
<v t="felix.20200213195413.1"><vh>asyncOutput</vh></v>
<v t="felix.20191126232434.7"><vh>sendLeoBridgePackage</vh></v>
<v t="felix.20191126232434.8"><vh>outputError</vh></v>
<v t="felix.20191126232434.9"><vh>outputBodyData</vh></v>
<v t="felix.20191126232434.10"><vh>outputPNode</vh></v>
<v t="felix.20191126232434.11"><vh>outputPNodes</vh></v>
</v>
<v t="felix.20191128000818.1"><vh>Outline Edition Commands</vh>
<v t="felix.20191127004621.1"><vh>markPNode</vh></v>
<v t="felix.20191127235913.1"><vh>unmarkPNode</vh></v>
<v t="felix.20191231203545.1"><vh>clonePNode</vh></v>
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
<v t="felix.20200120224033.1"><vh>insertNamedPNode</vh></v>
<v t="felix.20191127001506.2"><vh>promotePNode</vh></v>
<v t="felix.20191127001506.3"><vh>demotePNode</vh></v>
<v t="felix.20191231184412.1"><vh>sortChildrenPNode</vh></v>
<v t="felix.20191231184412.2"><vh>sortSiblingsPNode</vh></v>
<v t="felix.20191231201748.1"><vh>hoistPNode</vh></v>
<v t="felix.20191231201749.1"><vh>deHoist</vh></v>
</v>
<v t="felix.20191128001054.1"><vh>Outline and Body Interaction</vh>
<v t="felix.20200105173826.1"><vh>outlineCommand</vh></v>
<v t="felix.20191231203711.1"><vh>undo</vh></v>
<v t="felix.20200103204811.1"><vh>redo</vh></v>
<v t="felix.20200301235235.1"><vh>refreshFromDiskPNode</vh></v>
<v t="felix.20191231214801.1"><vh>executeScript</vh></v>
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
<t tx="felix.20190922171916.2">@doc
I should have started self documentation here from the start in august! 

    # TODO : Offer 'Real Clipboard' operations, instead of leo's 'internal' clipboard behavior -
    # Note : ('Real Clipboard') Use globals.gui.clipboard and the real clipboard with g.app.gui.getTextFromClipboard()
    # Note : ('Real Clipboard') For pasting, use g.app.gui.replaceClipboardWith(p_realClipboard)</t>
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
<t tx="felix.20191126232434.13">def openFile(self, p_file):
    '''Open a leo file via leoBridge controller'''
    self.commander = self.bridge.openLeoFile(p_file)  # create self.commander

    # * setup leoBackground to get messages from leo
    try:
        self.g.app.idleTimeManager.start()  # To catch derived file changes
    except:
        print('ERROR with idleTimeManager')

    if(self.commander):
        self.create_gnx_to_vnode()
        return self.outputPNode(self.commander.p)
    else:
        return self.outputError('Error in openFile')

</t>
<t tx="felix.20191126232434.14">def closeFile(self, p_paramUnused):
    '''Closes a leo file. A file can then be opened with "openFile"'''
    print("Trying to close opened file")
    if(self.commander):
        self.commander.close()
    return self.sendLeoBridgePackage()  # Just send empty as 'ok'

</t>
<t tx="felix.20191126232434.15">def getPNode(self, p_ap):
    '''EMIT OUT a node, don't select it'''
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
    for w_p in self.commander.all_positions():
        if w_p.v.gnx == p_package['gnx']:  # found
            b = self.commander.undoer.beforeChangeNodeContents(w_p, oldYScroll=0)  # setup undoable operation
            w_p.v.setBodyString(p_package['body'])
            self.commander.undoer.afterChangeNodeContents(w_p, command="set-body", bunch=b, dirtyVnodeList=[w_p.v])
            if not w_p.v.isDirty():
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
    '''Select a node, or the first one found with its GNX'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            if self.commander.positionExists(w_p):
                # set this node as selection
                self.commander.selectPosition(w_p)
            else:
                w_foundPNode = self.findPNodeFromGnx(p_ap['gnx'])
                if w_foundPNode:
                    self.commander.selectPosition(w_foundPNode)
                else:
                    print("Set Selection node does not exist! ap was:" + json.dumps(p_ap))
    # * return the finally selected node
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
    if p.isAnyAtFileNode():
        w_ap['atFile'] = True
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
                                       verbose=False)     # True: prints messages that would be sent to the log pane.
    self.g = self.bridge.globals()

    # * Trace outputs to pythons stdout, also prints the function call stack
    # self.g.trace('test trace')

    # * Intercept Log Pane output: Sends to vsCode's log pane
    self.g.es = self.es  # pointer - not a function call

    # print(dir(self.g))
    self.currentActionId = 1  # Id of action being processed, STARTS AT 1 = Initial 'ready'
    # self.commander = None  # going to store the leo file commander once its opened from leo.core.leoBridge
    self.webSocket = None
    self.loop = None

    self.g.IdleTime = self._idleTime
    self.g.app.idleTimeManager = IdleTimeManager(self.g)
    self.g.app.commanders = self._commanders

    self.efc = ExternalFilesController(self)

</t>
<t tx="felix.20191126232434.7">def sendLeoBridgePackage(self, p_key=False, p_any=None):
    w_package = {"id": self.currentActionId}
    if p_key:
        w_package[p_key] = p_any  # add [key]?:any
    return(json.dumps(w_package, separators=(',', ':')))  # send as json
    # await self.webSocket.send(json.dumps(w_package, separators=(',', ':')))  # send as json

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
    print("Starting LeoBridge... (Launch with -h for help)")
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

    # * This is a basic example loop
    async def asyncInterval(timeout):
        dummyCounter = 0
        strTimeout = str(timeout) + ' sec interval'
        while True:
            await asyncio.sleep(timeout)
            dummyCounter = dummyCounter+1
            await integController.asyncOutput("{\"interval\":" + str(timeout+dummyCounter) + "}")  # as number
            print(strTimeout)

    async def leoBridgeServer(websocket, path):
        try:
            integController.initConnection(websocket)
            await websocket.send(integController.sendLeoBridgePackage())  # * Start by sending empty as 'ok'
            integController.logSignon()
            async for w_message in websocket:
                w_param = json.loads(w_message)
                if w_param and w_param['action']:
                    # print("action:" + w_param['action'])
                    # * Storing id of action in global var instead of passing as parameter
                    integController.setActionId(w_param['id'])
                    # ! functions called this way need to accept at least a parameter other than 'self'
                    # ! See : getSelectedNode and getAllGnx
                    # TODO : Block functions starting with underscore or reserved
                    answer = getattr(integController, w_param['action'])(w_param['param'])
                else:
                    answer = "Error in processCommand"
                    print(answer)
                await websocket.send(answer)
        except:
            print("Caught Websocket Disconnect Event")
        finally:
            asyncio.get_event_loop().stop()

    localLoop = asyncio.get_event_loop()
    start_server = websockets.serve(leoBridgeServer, wsHost, wsPort)
    localLoop.create_task(asyncInterval(3))
    localLoop.run_until_complete(start_server)
    print("LeoBridge started at " + wsHost + " on port: " + str(wsPort) + " [ctrl+c] to break", flush=True)
    localLoop.run_forever()
    print("Stopping leobridge server")


</t>
<t tx="felix.20191127000344.1">def movePNodeDown(self, p_ap):
    '''Move a node DOWN, don't select it if possible'''
    return self.outlineCommand("moveOutlineDown", p_ap, True)

</t>
<t tx="felix.20191127000419.1">def movePNodeLeft(self, p_ap):
    '''Move a node LEFT, don't select it if possible'''
    return self.outlineCommand("moveOutlineLeft", p_ap, True)

</t>
<t tx="felix.20191127000420.1">def movePNodeRight(self, p_ap):
    '''Move a node RIGHT, don't select it if possible'''
    return self.outlineCommand("moveOutlineRight", p_ap, True)

</t>
<t tx="felix.20191127000420.2">def movePNodeUp(self, p_ap):
    '''Move a node UP, don't select it if possible'''
    return self.outlineCommand("moveOutlineUp", p_ap, True)

</t>
<t tx="felix.20191127001506.1">def insertPNode(self, p_ap):
    '''Insert a node at given node, then select it once created, and finally return it'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            w_newNode = w_p.insertAfter()
            self.commander.selectPosition(w_newNode)
            return self.outputPNode(self.commander.p)  # in both cases, return selected node
        else:
            return self.outputError("Error in insertPNode no w_p node found")  # default empty
    else:
        return self.outputError("Error in insertPNode no param p_ap")

</t>
<t tx="felix.20191127001506.2">def promotePNode(self, p_ap):
    '''Promote a node, don't select it if possible'''
    return self.outlineCommand("promote", p_ap, True)

</t>
<t tx="felix.20191127001506.3">def demotePNode(self, p_ap):
    '''Demote a node, don't select it if possible'''
    return self.outlineCommand("demote", p_ap, True)

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
                    # Try again with childIndex
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # additional try with lowered childIndex
            # print("finally returning node" + self.commander.p.v.headString())
            return self.outputPNode(self.commander.p)  # in both cases, return selected node
        else:
            return self.outputError("Error in deletePNode no w_p node found")  # default empty
    else:
        return self.outputError("Error in deletePNode no param p_ap")

</t>
<t tx="felix.20191127004619.1">def copyPNode(self, p_ap):
    '''Copy a node, don't select it'''
    return self.outlineCommand("copyOutline", p_ap, True)

</t>
<t tx="felix.20191127004620.1">def cutPNode(self, p_ap):
    '''Cut a node, don't select it'''
    return self.outlineCommand("cutOutline", p_ap, True)

</t>
<t tx="felix.20191127004621.1">def markPNode(self, p_ap):
    '''Mark a node, don't select it'''
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
    '''Unmark a node, don't select it'''
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
import threading
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
    '''Paste a node, don't select it if possible'''
    return self.outlineCommand("pasteOutline", p_ap, True)

</t>
<t tx="felix.20191130211048.2">def pasteAsClonePNode(self, p_ap):
    '''Paste as clone, don't select it if possible'''
    return self.outlineCommand("pasteOutlineRetainingClones", p_ap, True)

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
<t tx="felix.20191231184412.1">def sortChildrenPNode(self, p_ap):
    '''Sort children of a node, don't select it if possible'''
    return self.outlineCommand("sortChildren", p_ap, True)

</t>
<t tx="felix.20191231184412.2">def sortSiblingsPNode(self, p_ap):
    '''Sort siblings of a node, don't select it if possible'''
    return self.outlineCommand("sortSiblings", p_ap, True)

</t>
<t tx="felix.20191231201748.1">def hoistPNode(self, p_ap):
    '''Select and Hoist a node'''
    return self.outlineCommand("hoist", p_ap)  # Don't try to re-select node

</t>
<t tx="felix.20191231201749.1">def deHoist(self, p_paramUnused):
    '''De-Hoist'''
    self.commander.dehoist()
    return self.outputPNode(self.commander.p)  # in any case, return selected node

</t>
<t tx="felix.20191231203545.1">def clonePNode(self, p_ap):
    '''Clone a node, return it if it was also the current selection, otherwise try not to select it'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            if w_p == self.commander.p:
                return self.outlineCommand("clone", p_ap, False)
            else:
                return self.outlineCommand("clone", p_ap, True)
        else:
            return self.outputError("Error in clonePNode function, no w_p node found")  # default empty
    else:
        return self.outputError("Error in clonePNode function, no param p_ap")

</t>
<t tx="felix.20191231203711.1">def undo(self, p_paramUnused):
    '''Undo last un-doable operation'''
    if(self.commander.undoer.canUndo()):
        self.commander.undoer.undo()
    return self.sendLeoBridgePackage()  # Just send empty as 'ok'

</t>
<t tx="felix.20191231214801.1">def executeScript(self, p_ap):
    '''Select a node and run its script'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            self.commander.selectPosition(w_p)
            self.commander.executeScript()
            # print("finally returning node" + self.commander.p.v.headString())
            return self.outputPNode(self.commander.p)  # in both cases, return selected node
        else:
            return self.outputError("Error in run no w_p node found")  # default empty
    else:
        return self.outputError("Error in run no param p_ap")

</t>
<t tx="felix.20200103204811.1">def redo(self, p_paramUnused):
    '''Undo last un-doable operation'''
    if(self.commander.undoer.canRedo()):
        self.commander.undoer.redo()
    return self.sendLeoBridgePackage()  # Just send empty as 'ok'

</t>
<t tx="felix.20200105173826.1">def outlineCommand(self, p_command, p_ap, p_keepSelection=False):
    '''Generic call to an outline operation (p_command) for specific p-node (p_ap), with possibility of trying to preserve the current selection (p_keepSelection)'''
    if(p_ap):
        w_p = self.ap_to_p(p_ap)
        if w_p:
            w_func = getattr(self.commander, p_command)
            if w_p == self.commander.p:
                # print("already on selection")
                w_func()
            else:
                # print("not on selection")
                oldPosition = self.commander.p  # not same node, save position to possibly return to
                self.commander.selectPosition(w_p)
                w_func()
                if p_keepSelection and self.commander.positionExists(oldPosition):
                    self.commander.selectPosition(oldPosition)  # select if old position still valid
            return self.outputPNode(self.commander.p)  # in both cases, return selected node
        else:
            return self.outputError("Error in " + p_command + " no w_p node found")  # default empty
    else:
        return self.outputError("Error in " + p_command + " no param p_ap")

</t>
<t tx="felix.20200120224033.1">def insertNamedPNode(self, p_apHeadline):
    '''Insert a node at given node, set its headline, select it and finally return it'''
    w_newHeadline = p_apHeadline['headline']
    w_ap = p_apHeadline['node']
    if(w_ap):
        w_p = self.ap_to_p(w_ap)
        if w_p:
            w_newNode = w_p.insertAfter()
            self.commander.selectPosition(w_newNode)
            # set this node's new headline
            w_newNode.h = w_newHeadline
            return self.outputPNode(self.commander.p)  # in any case, return selected node
        else:
            return self.outputError("Error in insertNamedPNode no w_p node found")  # default empty
    else:
        return self.outputError("Error in insertNamedPNode no param w_ap")

</t>
<t tx="felix.20200211202929.1">def initConnection(self, p_webSocket):
    self.webSocket = p_webSocket
    self.loop = asyncio.get_event_loop()

</t>
<t tx="felix.20200213195413.1">async def asyncOutput(self, p_json):
    '''Output json string to the websocket'''
    if(self.webSocket):
        await self.webSocket.send(p_json)
    else:
        print("websocket not ready yet")

</t>
<t tx="felix.20200216160305.1">def saveFile(self, p_paramUnused):
    '''Saves the leo file. New or dirty derived files are rewritten'''
    if(self.commander):
        self.commander.save()
    return self.sendLeoBridgePackage()  # Just send empty as 'ok'

</t>
<t tx="felix.20200219222712.1">def es(self, * args, **keys):
    '''Output to the Log Pane'''
    d = {
        'color': None,
        'commas': False,
        'newline': True,
        'spaces': True,
        'tabName': 'Log',
        'nodeLink': None,
    }
    d = self.g.doKeywordArgs(keys, d)
    s = self.g.translateArgs(args, d)
    w_package = {"log": s}
    if self.loop:
        self.loop.create_task(self.asyncOutput(json.dumps(w_package, separators=(',', ':'))))
    else:
        print('no loop!' + json.dumps(w_package, separators=(',', ':')))

</t>
<t tx="felix.20200219224515.1">def logSignon(self):
    '''Simulate the Initial Leo Log Entry'''
    if self.loop:
        self.g.app.computeSignon()
        self.g.es(str(self.g.app.signon))
        self.g.es(str(self.g.app.signon1))
    else:
        print('no loop in logSignon')

</t>
<t tx="felix.20200301235235.1">def refreshFromDiskPNode(self, p_ap):
    '''Refresh from Disk, don't select it if possible'''
    return self.outlineCommand("refreshFromDisk", p_ap, True)

</t>
<t tx="felix.20200302204251.1">class IdleTimeManager:
    """
    A singleton class to manage idle-time handling. This class handles all
    details of running code at idle time, including running 'idle' hooks.

    Any code can call g.app.idleTimeManager.add_callback(callback) to cause
    the callback to be called at idle time forever.
    """
    # TODO : REVISE/REPLACE WITH OWN SYSTEM

    def __init__(self, g):
        """Ctor for IdleTimeManager class."""
        self.g = g
        self.callback_list = []
        self.timer = None
        self.on_idle_count = 0

    @others

</t>
<t tx="felix.20200302204251.2">def add_callback(self, callback):
    """Add a callback to be called at every idle time."""
    self.callback_list.append(callback)

</t>
<t tx="felix.20200302204251.3">def on_idle(self, timer):
    """IdleTimeManager: Run all idle-time callbacks."""
    print("PRINTING IN IDLE LOOP")
    # self.g.es("EMITTING IN IDLE LOOP")
    # return

    if not self.g.app:
        return
    if self.g.app.killed:
        return
    if not self.g.app.pluginsController:
        self.g.trace('No g.app.pluginsController', self.g.callers())
        timer.stop()
        return  # For debugger.
    self.on_idle_count += 1
    # Handle the registered callbacks.
    # print("list length : ", len(self.callback_list))
    for callback in self.callback_list:
        try:
            callback()
        except Exception:
            self.g.es_exception()
            self.g.es_print(f"removing callback: {callback}")
            self.callback_list.remove(callback)
    # Handle idle-time hooks.
    self.g.app.pluginsController.on_idle()

</t>
<t tx="felix.20200302204251.4">def start(self):
    """Start the idle-time timer."""
    self.timer = self.g.IdleTime(
        self.on_idle,
        delay=5000,
        tag='IdleTimeManager.on_idle')
    if self.timer:
        self.timer.start()

</t>
<t tx="felix.20200302205810.1">class ExternalFilesController:
    '''EFC Modified from Leo sources'''
    # TODO : REVISE/REPLACE WITH OWN SYSTEM

    @others

</t>
<t tx="felix.20200302205810.2">def __init__(self, integController):
    '''Ctor for ExternalFiles class.'''
    self.on_idle_count = 0
    self.integController = integController
    self.checksum_d = {}
    # Keys are full paths, values are file checksums.
    self.enabled_d = {}
    # For efc.on_idle.
    # Keys are commanders.
    # Values are cached @bool check-for-changed-external-file settings.
    self.has_changed_d = {}
    # Keys are commanders. Values are boolean.
    # Used only to limit traces.
    self.unchecked_commanders = []
    # Copy of g.app.commanders()
    self.unchecked_files = []
    # Copy of self file. Only one files is checked at idle time.
    self._time_d = {}
    # Keys are full paths, values are modification times.
    # DO NOT alter directly, use set_time(path) and
    # get_time(path), see set_time() for notes.
    self.yesno_all_time = 0  # previous yes/no to all answer, time of answer
    self.yesno_all_answer = None  # answer, 'yes-all', or 'no-all'

    self.integController.g.app.idleTimeManager.add_callback(self.on_idle)
    
    self.waitingForAnswer = False
    self.lastPNode = None # last p node that was asked for if not set to "AllYes\AllNo"
    self.lastCommander = None
    
    print("Created ExternalFilesController")

</t>
<t tx="felix.20200302205810.21"></t>
<t tx="felix.20200302205810.22">def ask(self, c, path, p=None):
    '''
    Ask user whether to overwrite an @&lt;file&gt; tree.
    Return True if the user agrees.
    '''
    if self.yesno_all_time + 3 &gt;= time.time() and self.yesno_all_answer:
        self.yesno_all_time = time.time()  # Still reloading?  Extend time.
        return bool('yes' in self.yesno_all_answer.lower())
    if not p:
        where = 'the outline node'
    else:
        where = p.h
        
    _is_leo = path.endswith(('.leo', '.db'))
    
    if _is_leo:
        s = '\n'.join([
            f'{self.integController.g.splitLongFileName(path)} has changed outside Leo.',
            'Overwrite it?'
        ])
    else:
        s = '\n'.join([
            f'{self.integController.g.splitLongFileName(path)} has changed outside Leo.',
            f"Reload {where} in Leo?",
        ])
        
    w_package = {"ask": 'Overwrite the version in Leo?', "message": s, "yes_all": not _is_leo, "no_all": not _is_leo}
          
    self.integController.sendAsyncOutput(w_package)
    self.waitingForAnswer = True
    return False
    # result = self.integController.g.app.gui.runAskYesNoDialog(c, 'Overwrite the version in Leo?', s,
                                                              # yes_all=not _is_leo, no_all=not _is_leo)
                                                              
    # if result and "-all" in result.lower():
        # self.yesno_all_time = time.time()
        # self.yesno_all_answer = result.lower()
        
    # return bool(result and 'yes' in result.lower())
    

</t>
<t tx="felix.20200302205810.23">def checksum(self, path):
    '''Return the checksum of the file at the given path.'''
    import hashlib
    return hashlib.md5(open(path, 'rb').read()).hexdigest()

</t>
<t tx="felix.20200302205810.25">def get_mtime(self, path):
    '''Return the modification time for the path.'''
    return self.integController.g.os_path_getmtime(self.integController.g.os_path_realpath(path))

</t>
<t tx="felix.20200302205810.26">def get_time(self, path):
    '''
    return timestamp for path

    see set_time() for notes
    '''
    return self._time_d.get(self.integController.g.os_path_realpath(path))

</t>
<t tx="felix.20200302205810.27">def has_changed(self, c, path):
    '''Return True if p's external file has changed outside of Leo.'''
    if not self.integController.g.os_path_exists(path):
        return False
    if self.integController.g.os_path_isdir(path):
        return False
    #
    # First, check the modification times.
    old_time = self.get_time(path)
    new_time = self.get_mtime(path)
    if not old_time:
        # Initialize.
        self.set_time(path, new_time)
        self.checksum_d[path] = self.checksum(path)
        return False
    if old_time == new_time:
        return False
    #
    # Check the checksums *only* if the mod times don't match.
    old_sum = self.checksum_d.get(path)
    new_sum = self.checksum(path)
    if new_sum == old_sum:
        # The modtime changed, but it's contents didn't.
        # Update the time, so we don't keep checking the checksums.
        # Return False so we don't prompt the user for an update.
        self.set_time(path, new_time)
        return False
    # The file has really changed.
    assert old_time, path
    # #208: external change overwrite protection only works once.
    # If the Leo version is changed (dirtied) again,
    # overwrite will occur without warning.
    # self.set_time(path, new_time)
    # self.checksum_d[path] = new_sum
    return True

</t>
<t tx="felix.20200302205810.28">def is_enabled(self, c):
    '''Return the cached @bool check_for_changed_external_file setting.'''
    d = self.enabled_d
    val = d.get(c)
    if val is None:
        val = c.config.getBool('check-for-changed-external-files', default=False)
        d[c] = val
    return val

</t>
<t tx="felix.20200302205810.29">def join(self, s1, s2):
    '''Return s1 + ' ' + s2'''
    return f"{s1} {s2}"

</t>
<t tx="felix.20200302205810.30">def set_time(self, path, new_time=None):
    '''
    Implements c.setTimeStamp.

    Update the timestamp for path.

    NOTE: file paths with symbolic links occur with and without those links
    resolved depending on the code call path.  This inconsistency is
    probably not Leo's fault but an underlying Python issue.
    Hence the need to call realpath() here.
    '''
    t = new_time or self.get_mtime(path)
    self._time_d[self.integController.g.os_path_realpath(path)] = t

</t>
<t tx="felix.20200302205810.31">def warn(self, c, path, p):
    '''
    Warn that an @asis or @nosent node has been changed externally.

    There is *no way* to update the tree automatically.
    '''
    if self.integController.g.unitTesting or c not in self.integController.g.app.commanders():
        return
    if not p:
        self.integController.g.trace('NO P')
        return

    s = '\n'.join([
        '%s has changed outside Leo.\n' % self.integController.g.splitLongFileName(path),
        'Leo can not update this file automatically.\n',
        'This file was created from %s.\n' % p.h,
        'Warning: refresh-from-disk will destroy all children.'
    ])

    w_package = {"warn": 'External file changed', "message": s}
          
    self.integController.sendAsyncOutput(w_package)
    self.waitingForAnswer = True
</t>
<t tx="felix.20200302205810.7">def on_idle(self):
    '''
    Check for changed open-with files and all external files in commanders
    for which @bool check_for_changed_external_file is True.
    '''
    if not self.integController.g.app or self.integController.g.app.killed:
        return
    if self.waitingForAnswer:
        return

    self.on_idle_count += 1

    if self.unchecked_commanders:
        # Check the next commander for which
        # @bool check_for_changed_external_file is True.
        c = self.unchecked_commanders.pop()
        self.lastCommander = c
        self.idle_check_commander(c)
    else:
        # Add all commanders for which
        # @bool check_for_changed_external_file is True.
        self.unchecked_commanders = [
            z for z in self.integController.g.app.commanders() if self.is_enabled(z)
        ]

</t>
<t tx="felix.20200302205810.8">def idle_check_commander(self, c):
    '''
    Check all external files corresponding to @&lt;file&gt; nodes in c for
    changes.
    '''
    # #1100: always scan the entire file for @&lt;file&gt; nodes.
    # #1134: Nested @&lt;file&gt; nodes are no longer valid, but this will do no harm.
    for p in c.all_unique_positions():
        if self.waitingForAnswer:
            break
        if p.isAnyAtFileNode():
            self.idle_check_at_file_node(c, p)

</t>
<t tx="felix.20200302205810.9">def idle_check_at_file_node(self, c, p):
    '''Check the @&lt;file&gt; node at p for external changes.'''
    trace = False
    # Matt, set this to True, but only for the file that interests you.\
    # trace = p.h == '@file unregister-leo.leox'
    path = self.integController.g.fullPath(c, p)
    has_changed = self.has_changed(c, path)
    if trace:
        self.integController.g.trace('changed', has_changed, p.h)
    if has_changed:
        if not self.lastPNode:
            self.lastPNode = p # can be set here because same for ask/wanr whatever
        if p.isAtAsisFileNode() or p.isAtNoSentFileNode():
            # Fix #1081: issue a warning.
            self.warn(c, path, p=p)
        else:
            self.ask(c, path, p=p)
            
        # c.redraw(p=p)
        # c.refreshFromDisk(p)
        # c.redraw()
        
        # Always update the path &amp; time to prevent future warnings.
        self.set_time(path)
        self.checksum_d[path] = self.checksum(path)

</t>
<t tx="felix.20200303211848.1">def _commanders(self):
    ''' Return list of currently active controllers '''
    # TODO : REVISE/REPLACE WITH OWN SYSTEM
    # return [f.c for f in g.app.windowList]
    return [self.commander]

</t>
<t tx="felix.20200303214235.1">async def _asyncIdleLoop(self, p_seconds, p_fn):
    while True:
        await asyncio.sleep(p_seconds)
        p_fn(self)

</t>
<t tx="felix.20200303214255.1">def _idleTime(self, fn, delay, tag):
    # TODO : REVISE/REPLACE WITH OWN SYSTEM    
    asyncio.get_event_loop().create_task(self._asyncIdleLoop(delay/1000, fn))

</t>
<t tx="felix.20200304220844.1">def askResult(self, p_result):
    '''Got the result to an asked question/warning from vscode'''
    print("got result: " + str(p_result))
    this.efc.integResult(p_result)

</t>
<t tx="felix.20200304221925.1">def integResult(p_result):
    # Got the result to an asked question/warning from vscode
    pass
    # check if p_resultwas from a warn or an ask yes/no/allyes/allno
    # act accordingly

    path = self.integController.g.fullPath(c, p)
    



    # Always update the path &amp; time to prevent future warnings.
    self.set_time(path)
    self.checksum_d[path] = self.checksum(path)

</t>
<t tx="felix.20200304224909.1">def sendAsyncOutput(p_package):
    if self.loop:
        self.loop.create_task(self.asyncOutput(json.dumps(p_package, separators=(',', ':'))))
    else:
        print('no loop!' + json.dumps(p_package, separators=(',', ':')))
    

</t>
</tnodes>
</leo_file>
