#! python3
import leo.core.leoBridge as leoBridge
import leo.core.leoBackground as leoBackground
import leo.core.leoExternalFiles as leoExternalFiles
import leo.core.leoNodes as leoNodes
import asyncio
import websockets
import sys
import getopt
import os
import time
import json

# server defaults
wsHost = "localhost"
wsPort = 32125


class IdleTimeManager:
    """
    A singleton class to manage idle-time handling. This class handles all
    details of running code at idle time, including running 'idle' hooks.

    Any code can call g.app.idleTimeManager.add_callback(callback) to cause
    the callback to be called at idle time forever.
    """
    #  1- So I wonder if I should make 'g' global?
    #  2- In relation to the first point, I also wonder if/how I can import IdleTimeManager from the leoApp python file and use a global 'g' instead of copying it with 'self.g' instead of 'g' ?

    def __init__(self, g):
        """Ctor for IdleTimeManager class."""
        self.g = g
        self.callback_list = []
        self.timer = None
        self.on_idle_count = 0

    def add_callback(self, callback):
        """Add a callback to be called at every idle time."""
        self.callback_list.append(callback)

    def on_idle(self, timer):
        """IdleTimeManager: Run all idle-time callbacks."""
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

    def start(self):
        """Start the idle-time timer."""
        self.timer = self.g.IdleTime(
            self.on_idle,
            delay=500,
            tag='IdleTimeManager.on_idle')
        if self.timer:
            self.timer.start()


class leoBridgeIntegController:
    '''Leo Bridge Controller'''

    def __init__(self):
        self.gnx_to_vnode = []  # utility array - see leoflexx.py in leoPluginsRef.leo
        self.bridge = leoBridge.controller(gui='nullGui',
                                           loadPlugins=False,  # True: attempt to load plugins.
                                           readSettings=True,  # True: read standard settings files.
                                           silent=True,      # True: don't print signon messages.
                                           verbose=False)     # True: prints messages that would be sent to the log pane.
        self.g = self.bridge.globals()
        self.g.trace('test trace')
        # * Intercept Log Pane output
        self.g.es = self.es  # pointer - not a function call
        # print(dir(self.g))
        self.currentActionId = 1  # Id of action being processed, STARTS AT 1 = Initial 'ready'
        # self.commander = None  # going to store the leo file commander once its opened from leo.core.leoBridge
        self.webSocket = None
        self.loop = None

        self.g.IdleTime = self.idleTime  # custom method pointer - not a function call
        self.g.app.idleTimeManager = IdleTimeManager(self.g)  # a custom async class to set intervals for callbacks
        self.g.app.backgroundProcessManager = leoBackground.BackgroundProcessManager()
        self.g.app.externalFilesController = leoExternalFiles.ExternalFilesController()
        self.g.app.gui.runAskYesNoDialog = self.runAskYesNoDialog  # custom method pointer - not a function call
        self.g.app.gui.runAskOkDialog = self.runAskYesNoDialog  # same as "yes no" pointer - not a function call
        self.g.app.commanders = self.commanders  # custom method  pointer - not a function call

    def test(self, p_param):
        '''Emit a test'''
        self.loop.create_task(self.asyncOutput(
            "{\"asyncOutput\":\"Here's your ASYNC text string payload that you ordered!\"}"))
        print('vsCode called test. Hello from leoBridge! your param was: ' + json.dumps(p_param, separators=(',', ':')))
        return self.sendLeoBridgePackage("package", "test string from the dummy standard response package")

    def logSignon(self):
        if self.loop:
            self.g.app.computeSignon()
            self.g.es(str(self.g.app.signon))
            self.g.es(str(self.g.app.signon1))
        else:
            print('no loop in logSignon')

    def runAskYesNoDialog(self, c, title, message=None, yes_all=False, no_all=False):
        """Create and run an askYesNo dialog."""
        w_package = {"ask": title, "message": message, "yes_all": yes_all, "no_all": no_all}
        if self.loop:
            self.loop.create_task(self.asyncOutput(json.dumps(w_package, separators=(',', ':'))))
        else:
            print('no loop!' + json.dumps(w_package, separators=(',', ':')))

    def commanders(self):
        """ Return list of currently active controllers """
        # return [f.c for f in g.app.windowList]
        return [self.commander]

    async def asyncIdleLoop(self, p_seconds, p_fn):
        while True:
            await asyncio.sleep(p_seconds)
            p_fn(self)

    def idleTime(self, fn, delay, tag):
        asyncio.get_event_loop().create_task(self.asyncIdleLoop(delay/1000, fn))

    def es(self, s, color=None, tabName='Log', from_redirect=False, nodeLink=None):
        '''Output to the Log Pane'''
        w_package = {"log": s}
        if self.loop:
            self.loop.create_task(self.asyncOutput(json.dumps(w_package, separators=(',', ':'))))
        else:
            print('no loop!' + json.dumps(w_package, separators=(',', ':')))

    def initConnection(self, p_webSocket):
        self.webSocket = p_webSocket
        self.loop = asyncio.get_event_loop()

    def openFile(self, p_file):
        '''Open a leo file via leoBridge controller'''
        self.commander = self.bridge.openLeoFile(p_file)  # create self.commander

        try:
            self.g.app.idleTimeManager.start()  # To catch derived file changes
        except:
            print('ERROR with idleTimeManager')

        if(self.commander):
            self.create_gnx_to_vnode()
            # * setup leoBackground to get messages from leo
            return self.outputPNode(self.commander.p)
        else:
            return self.outputError('Error in openFile')

    def closeFile(self, p_paramUnused):
        '''Closes a leo file. A file can then be opened with "openFile"'''
        print("Trying to close opened file")
        if(self.commander):
            self.commander.close()
        return self.sendLeoBridgePackage()  # Just send empty as 'ok'

    def saveFile(self, p_paramUnused):
        '''Saves the leo file. New or dirty derived files are rewritten'''
        if(self.commander):
            self.commander.save()
        return self.sendLeoBridgePackage()  # Just send empty as 'ok'

    def setActionId(self, p_id):
        self.currentActionId = p_id

    async def asyncOutput(self, p_json):
        '''Output json string to the websocket'''
        if(self.webSocket):
            await self.webSocket.send(p_json)
        else:
            print("websocket not ready yet")

    def sendLeoBridgePackage(self, p_key=False, p_any=None):
        w_package = {"id": self.currentActionId}
        if p_key:
            w_package[p_key] = p_any  # add [key]?:any
        return(json.dumps(w_package, separators=(',', ':')))  # send as json
        # await self.webSocket.send(json.dumps(w_package, separators=(',', ':')))  # send as json

    def outputError(self, p_message="Unknown Error"):
        print("ERROR: " + p_message)  # Output to this server's running console
        w_package = {"id": self.currentActionId}
        w_package["error"] = p_message
        return p_message

    def outputBodyData(self, p_bodyText=""):
        return self.sendLeoBridgePackage("bodyData", p_bodyText)

    def outputPNode(self, p_node=False):
        if p_node:
            return self.sendLeoBridgePackage("node", self.p_to_ap(p_node))  # Single node, singular
        else:
            return self.sendLeoBridgePackage("node", None)

    def outputPNodes(self, p_pList):
        w_apList = []
        for p in p_pList:
            w_apList.append(self.p_to_ap(p))
        return self.sendLeoBridgePackage("nodes", w_apList)  # Multiple nodes, plural

    def markPNode(self, p_ap):
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

    def unmarkPNode(self, p_ap):
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

    def clonePNode(self, p_ap):
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

    def copyPNode(self, p_ap):
        '''Copy a node, don't select it'''
        return self.outlineCommand("copyOutline", p_ap, True)

    def cutPNode(self, p_ap):
        '''Cut a node, don't select it'''
        return self.outlineCommand("cutOutline", p_ap, True)

    def pastePNode(self, p_ap):
        '''Paste a node, don't select it if possible'''
        return self.outlineCommand("pasteOutline", p_ap, True)

    def pasteAsClonePNode(self, p_ap):
        '''Paste as clone, don't select it if possible'''
        return self.outlineCommand("pasteOutlineRetainingClones", p_ap, True)

    def deletePNode(self, p_ap):
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

    def movePNodeDown(self, p_ap):
        '''Move a node DOWN, don't select it if possible'''
        return self.outlineCommand("moveOutlineDown", p_ap, True)

    def movePNodeLeft(self, p_ap):
        '''Move a node LEFT, don't select it if possible'''
        return self.outlineCommand("moveOutlineLeft", p_ap, True)

    def movePNodeRight(self, p_ap):
        '''Move a node RIGHT, don't select it if possible'''
        return self.outlineCommand("moveOutlineRight", p_ap, True)

    def movePNodeUp(self, p_ap):
        '''Move a node UP, don't select it if possible'''
        return self.outlineCommand("moveOutlineUp", p_ap, True)

    def insertPNode(self, p_ap):
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

    def insertNamedPNode(self, p_apHeadline):
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

    def promotePNode(self, p_ap):
        '''Promote a node, don't select it if possible'''
        return self.outlineCommand("promote", p_ap, True)

    def demotePNode(self, p_ap):
        '''Demote a node, don't select it if possible'''
        return self.outlineCommand("demote", p_ap, True)

    def sortChildrenPNode(self, p_ap):
        '''Sort children of a node, don't select it if possible'''
        return self.outlineCommand("sortChildren", p_ap, True)

    def sortSiblingsPNode(self, p_ap):
        '''Sort siblings of a node, don't select it if possible'''
        return self.outlineCommand("sortSiblings", p_ap, True)

    def hoistPNode(self, p_ap):
        '''Select and Hoist a node'''
        return self.outlineCommand("hoist", p_ap)  # Don't try to re-select node

    def deHoist(self, p_paramUnused):
        '''De-Hoist'''
        self.commander.dehoist()
        return self.outputPNode(self.commander.p)  # in any case, return selected node

    def outlineCommand(self, p_command, p_ap, p_keepSelection=False):
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

    def undo(self, p_paramUnused):
        '''Undo last un-doable operation'''
        if(self.commander.undoer.canUndo()):
            self.commander.undoer.undo()
        return self.sendLeoBridgePackage()  # Just send empty as 'ok'

    def redo(self, p_paramUnused):
        '''Undo last un-doable operation'''
        if(self.commander.undoer.canRedo()):
            self.commander.undoer.redo()
        return self.sendLeoBridgePackage()  # Just send empty as 'ok'

    def executeScript(self, p_ap):
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

    def getPNode(self, p_ap):
        '''EMIT OUT a node, don't select it'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                return self.outputPNode(w_p)
            else:
                return self.outputError("Error in getPNode no w_p node found")
        else:
            return self.outputError("Error in getPNode no param p_ap")

    def getChildren(self, p_ap):
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

    def getParent(self, p_ap):
        '''EMIT OUT the parent of a node, as an array, even if unique or empty'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p and w_p.hasParent():
                return self.outputPNode(w_p.getParent())
            else:
                return self.outputPNode()  # default empty for root
        else:
            return self.outputPNode()

    def getSelectedNode(self, p_paramUnused):
        '''EMIT OUT Selected Position as an array, even if unique'''
        if(self.commander.p):
            return self.outputPNode(self.commander.p)
        else:
            return self.outputPNode()

    def getAllGnx(self, p_paramUnused):
        '''Get gnx array from all unique nodes'''
        w_all_gnx = [p.v.gnx for p in self.commander.all_unique_positions(copy=False)]
        return self.sendLeoBridgePackage("allGnx", w_all_gnx)

    def getBody(self, p_gnx):
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

    def getBodyLength(self, p_gnx):
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

    def setNewBody(self, p_body):
        '''Change Body of selected node'''
        if(self.commander.p):
            self.commander.p.b = p_body['body']
            return self.outputPNode(self.commander.p)
        else:
            return self.outputError("Error in setNewBody")

    def setBody(self, p_package):
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

    def setNewHeadline(self, p_apHeadline):
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

    def setSelectedNode(self, p_ap):
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

    def expandNode(self, p_ap):
        '''Expand a node'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                w_p.expand()
        return self.sendLeoBridgePackage()  # Just send empty as 'ok'

    def collapseNode(self, p_ap):
        '''Collapse a node'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                w_p.contract()
        return self.sendLeoBridgePackage()  # Just send empty as 'ok'

    def yieldAllRootChildren(self):
        '''Return all root children P nodes'''
        p = self.commander.rootPosition()
        while p:
            yield p
            p.moveToNext()

    def findPNodeFromGnx(self, p_gnx):
        '''Return first p node with this gnx or false'''
        for p in self.commander.all_unique_positions():
            if p.v.gnx == p_gnx:
                return p
        return False

    def create_gnx_to_vnode(self):
        '''Make the first gnx_to_vnode array with all unique nodes'''
        t1 = time.process_time()
        self.gnx_to_vnode = {v.gnx: v for v in self.commander.all_unique_nodes()}
        # This is likely the only data that ever will be needed.
        if 0:
            print('app.create_all_data: %5.3f sec. %s entries' % (
                (time.process_time()-t1), len(list(self.gnx_to_vnode.keys()))))
        self.test_round_trip_positions()

    def test_round_trip_positions(self):
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

    def ap_to_p(self, ap):
        '''(From Leo plugin leoflexx.py) Convert an archived position to a true Leo position.'''
        childIndex = ap['childIndex']
        v = self.gnx_to_vnode[ap['gnx']]
        stack = [
            (self.gnx_to_vnode[d['gnx']], d['childIndex'])
            for d in ap['stack']
        ]
        return leoNodes.position(v, childIndex, stack)

    def p_to_ap(self, p):
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


def main():
    '''python script for leo integration via leoBridge'''
    global wsHost, wsPort
    print("Starting LeoBridge... (Launch with -h for help)")
    # replace default host address and port if provided as arguments

    try:
        opts, args = getopt.getopt(sys.argv[1:], "ha:p:", ["help", "address=", "port="])
    except getopt.GetoptError:
        print('leobridgeserver.py -a <address> -p <port>')
        print('defaults to localhost on port 32125')
        if args:
            print("unused args: " + str(args))
        sys.exit(2)
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            print('leobridgeserver.py -a <address> -p <port>')
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
                    answer = getattr(integController, w_param['action'])(w_param['param'])
                else:
                    answer = "Error in processCommand"
                    print(answer)
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

    # from leoApp.py :  g.app.backgroundProcessManager = leoBackground.BackgroundProcessManager()
    # g.app.idleTimeManager.start() after loading leo file


if __name__ == '__main__':
    # Startup
    try:
        main()
    except KeyboardInterrupt:
        print("\nKeyboard Interupt: Stopping leobridge server")
        sys.exit()
