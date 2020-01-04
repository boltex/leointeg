#! python3
import leo.core.leoBridge as leoBridge
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


class leoBridgeIntegController:
    '''Leo Bridge Controller'''

    def __init__(self):
        self.gnx_to_vnode = []  # utility array - see leoflexx.py in leoPluginsRef.leo
        self.bridge = leoBridge.controller(gui='nullGui',
                                           loadPlugins=False,  # True: attempt to load plugins.
                                           readSettings=True,  # True: read standard settings files.
                                           silent=True,      # True: don't print signon messages.
                                           verbose=False)     # True: print informational messages.
        self.currentActionId = 1  # Id of action being processed, STARTS AT 1 = Initial 'ready'
        # self.commander = None  # going to store the leo file commander once its opened from leo.core.leoBridge

    def test(self, p_param):
        '''Emit a test'''
        print('vsCode called test. Hello from leoBridge! your param was: ' + json.dumps(p_param, separators=(',', ':')))
        return self.sendLeoBridgePackage("package", "test string from the response package")

    def openFile(self, p_file):
        '''Open a leo file via leoBridge controller'''
        print("Trying to open file: "+p_file)
        self.commander = self.bridge.openLeoFile(p_file)  # create self.commander
        if(self.commander):
            self.create_gnx_to_vnode()
            return self.outputPNode(self.commander.p)
        else:
            return self.outputError('Error in openFile')

    def closeFile(self):
        '''Closes a leo file. A file can then be opened with "openFile"'''
        print("Trying to close opened file")
        if(self.commander):
            self.commander.close()
        return self.sendLeoBridgePackage()  # Just send empty as 'ok'

    def setActionId(self, p_id):
        self.currentActionId = p_id

    def sendLeoBridgePackage(self, p_key=False, p_any=None):
        w_package = {"id": self.currentActionId}
        if p_key:
            w_package[p_key] = p_any  # add [key]?:any
        return(json.dumps(w_package, separators=(',', ':')))  # send as json

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
        '''Clone a node, don't select it'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    # print("already on selection")
                    self.commander.clone()
                else:
                    # print("not on selection")
                    oldPosition = self.commander.p  # not same node, save position to possibly return to
                    self.commander.selectPosition(w_p)
                    self.commander.clone()
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # select if old position still valid
                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in clonePNode no w_p node found")  # default empty
        else:
            return self.outputError("Error in clonePNode no param p_ap")

    def copyPNode(self, p_ap):
        '''Copy a node, don't select it'''
        # TODO - Offer 'Real Clipboard' operations, instead of leo's 'internal' clipboard behavior -
        # TODO : ('Real Clipboard') Use globals.gui.clipboard and the real clipboard with g.app.gui.getTextFromClipboard()
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    # print("already on selection")
                    self.commander.copyOutline()
                else:
                    # print("not on selection")
                    oldPosition = self.commander.p  # not same node, save position to possibly return to
                    self.commander.selectPosition(w_p)
                    self.commander.copyOutline()
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # select if old position still valid
                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in copyPNode no w_p node found")
        else:
            return self.outputError("Error in copyPNode no param p_ap")

    def cutPNode(self, p_ap):
        '''Cut a node, don't select it'''
        # TODO - Offer 'Real Clipboard' operations, instead of leo's 'internal' clipboard behavior -
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    # print("already on selection")
                    self.commander.cutOutline()
                else:
                    # print("not on selection")
                    oldPosition = self.commander.p  # not same node, save position to possibly return to
                    self.commander.selectPosition(w_p)
                    self.commander.cutOutline()
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # select if old position still valid
                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in cutPNode no w_p node found")  # default empty
        else:
            return self.outputError("Error in cutPNode no param p_ap")

    def pastePNode(self, p_ap):
        '''Paste a node, don't select it'''
        # TODO - Offer 'Real Clipboard' operations, instead of leo's 'internal' clipboard behavior -
        # TODO : ('Real Clipboard') For pasting, use g.app.gui.replaceClipboardWith(p_realClipboard)
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    # print("already on selection")
                    self.commander.pasteOutline()
                else:
                    # print("not on selection")
                    oldPosition = self.commander.p  # not same node, save position to possibly return to
                    self.commander.selectPosition(w_p)
                    self.commander.pasteOutline()
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # select if old position still valid
                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in pastePNode no w_p node found")  # default empty
        else:
            return self.outputError("Error in pastePNode no param p_ap")

    def pasteAsClonePNode(self, p_ap):
        '''Paste as clone, don't select it'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    # print("already on selection")
                    self.commander.pasteOutlineRetainingClones()
                else:
                    # print("not on selection")
                    oldPosition = self.commander.p  # not same node, save position to possibly return to
                    self.commander.selectPosition(w_p)
                    self.commander.pasteOutlineRetainingClones()
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # select if old position still valid
                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in pasteAsClonePNode no w_p node found")  # default empty
        else:
            return self.outputError("Error in pasteAsClonePNode no param p_ap")

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
                        if self.commander.positionExists(oldPosition):
                            self.commander.selectPosition(oldPosition)  # try with lowered childIndex
                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in deletePNode no w_p node found")  # default empty
        else:
            return self.outputError("Error in deletePNode no param p_ap")

    def movePNodeDown(self, p_ap):
        '''Move a node DOWN, don't select it if possible'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    # print("already on selection")
                    self.commander.moveOutlineDown()  # Move node
                else:
                    # print("not on selection")
                    oldPosition = self.commander.p  # not same node, save position to possibly return to
                    self.commander.selectPosition(w_p)
                    self.commander.moveOutlineDown()  # Move node
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # select if old position still valid
                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in movePNodeDown no w_p node found")  # default empty
        else:
            return self.outputError("Error in movePNodeDown no param p_ap")

    def movePNodeLeft(self, p_ap):
        '''Move a node LEFT, don't select it if possible'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    # print("already on selection")
                    self.commander.moveOutlineLeft()  # Move node
                else:
                    # print("not on selection")
                    oldPosition = self.commander.p  # not same node, save position to possibly return to
                    self.commander.selectPosition(w_p)
                    self.commander.moveOutlineLeft()  # Move node
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # select if old position still valid
                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in movePNodeLeft no w_p node found")  # default empty
        else:
            return self.outputError("Error in movePNodeLeft no param p_ap")

    def movePNodeRight(self, p_ap):
        '''Move a node RIGHT, don't select it if possible'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    # print("already on selection")
                    self.commander.moveOutlineRight()  # Move node
                else:
                    # print("not on selection")
                    oldPosition = self.commander.p  # not same node, save position to possibly return to
                    self.commander.selectPosition(w_p)
                    self.commander.moveOutlineRight()  # Move node
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # select if old position still valid
                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in movePNodeRight no w_p node found")  # default empty
        else:
            return self.outputError("Error in movePNodeRight no param p_ap")

    def movePNodeUp(self, p_ap):
        '''Move a node UP, don't select it if possible'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    # print("already on selection")
                    self.commander.moveOutlineUp()  # Move node
                else:
                    # print("not on selection")
                    oldPosition = self.commander.p  # not same node, save position to possibly return to
                    self.commander.selectPosition(w_p)
                    self.commander.moveOutlineUp()  # Move node
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # select if old position still valid
                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in movePNodeUp no w_p node found")  # default empty
        else:
            return self.outputError("Error in movePNodeUp no param p_ap")

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

    def promotePNode(self, p_ap):
        '''Promote a node, don't select it'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    # print("already on selection")
                    self.commander.promote()
                else:
                    # print("not on selection")
                    oldPosition = self.commander.p  # not same node, save position to possibly return to
                    self.commander.selectPosition(w_p)
                    self.commander.promote()
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # select if old position still valid
                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in promotePNode no w_p node found")  # default empty
        else:
            return self.outputError("Error in promotePNode no param p_ap")

    def demotePNode(self, p_ap):
        '''Demote a node, don't select it'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    # print("already on selection")
                    self.commander.demote()
                else:
                    # print("not on selection")
                    oldPosition = self.commander.p  # not same node, save position to possibly return to
                    self.commander.selectPosition(w_p)
                    self.commander.demote()
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # select if old position still valid
                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in demotePNode no w_p node found")  # default empty
        else:
            return self.outputError("Error in demotePNode no param p_ap")

    def hoistPNode(self, p_ap):
        '''Select and Hoist a node'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                self.commander.selectPosition(w_p)
                self.commander.hoist()
                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in hoistPNode no w_p node found")  # default empty
        else:
            return self.outputError("Error in hoistPNode no param p_ap")

    def deHoist(self, p_paramUnused):
        '''De-Hoist'''
        self.commander.dehoist()
        return self.outputPNode(self.commander.p)  # in any case, return selected node

    def sortChildrenPNode(self, p_ap):
        '''Sort children of a node, don't select it if possible'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    # print("already on selection")
                    self.commander.sortChildren()
                else:
                    # print("not on selection")
                    oldPosition = self.commander.p  # not same node, save position to possibly return to
                    self.commander.selectPosition(w_p)
                    self.commander.sortChildren()
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # select if old position still valid

                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in sortChildrenPNode no w_p node found")  # default empty
        else:
            return self.outputError("Error in sortChildrenPNode no param p_ap")

    def sortSiblingsPNode(self, p_ap):
        '''Sort siblings of a node, don't select it if possible'''
        if(p_ap):
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    # print("already on selection")
                    self.commander.sortSiblings()
                else:
                    # print("not on selection")
                    oldPosition = self.commander.p  # not same node, save position to possibly return to
                    self.commander.selectPosition(w_p)
                    self.commander.sortSiblings()
                    if self.commander.positionExists(oldPosition):
                        self.commander.selectPosition(oldPosition)  # select if old position still valid

                # print("finally returning node" + self.commander.p.v.headString())
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in sortSiblingsPNode no w_p node found")  # default empty
        else:
            return self.outputError("Error in sortSiblingsPNode no param p_ap")

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

    def run(self, p_ap):
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
        w_v = self.commander.fileCommands.gnxDict.get(p_package['gnx'])
        w_v.setBodyString(p_package['body'])
        if not w_v.isDirty():
            for w_p in self.commander.all_positions():
                if w_p.v == w_v:  # found
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
                        print("got first p node with gnx: " + p_ap['gnx'])
                        self.commander.selectPosition(w_foundPNode)
                    else:
                        print("Set Selection node does not exist! ap was:" + json.dumps(p_ap))
        # return self.sendLeoBridgePackage()  # Just send empty as 'ok'
        # * return the finally selected node instead
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


if __name__ == '__main__':
    # Startup
    try:
        main()
    except KeyboardInterrupt:
        print("\nKeyboard Interupt: Stopping leobridge server")
        sys.exit()
