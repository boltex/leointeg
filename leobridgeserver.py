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


class IdleTimeManager:
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
            delay=500,  # Milliseconds
            tag='IdleTimeManager.on_idle')
        if self.timer:
            self.timer.start()


class ExternalFilesController:
    '''EFC Modified from Leo's sources'''

    def __init__(self, integController):
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

        self.infoMessage = None  # if yesAll/noAll forced, then just show info message after idle_check_commander
        # False or "detected", "refreshed" or "ignored"

        self.integController.g.app.idleTimeManager.add_callback(self.on_idle)

        self.waitingForAnswer = False
        self.lastPNode = None  # last p node that was asked for if not set to "AllYes\AllNo"
        self.lastCommander = None

    def on_idle(self):
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

    def idle_check_commander(self, c):
        '''
        Check all external files corresponding to @<file> nodes in c for
        changes.
        '''
        # #1100: always scan the entire file for @<file> nodes.
        # #1134: Nested @<file> nodes are no longer valid, but this will do no harm.

        self.infoMessage = None  # reset infoMessage
        # False or "detected", "refreshed" or "ignored"

        for p in c.all_unique_positions():
            if self.waitingForAnswer:
                break
            if p.isAnyAtFileNode():
                self.idle_check_at_file_node(c, p)

        # if yesAll/noAll forced, then just show info message
        if self.infoMessage:
            w_package = {"async": "info", "message": self.infoMessage}
            self.integController.sendAsyncOutput(w_package)

    def idle_check_at_file_node(self, c, p):
        '''Check the @<file> node at p for external changes.'''
        trace = False
        # Matt, set this to True, but only for the file that interests you.\
        # trace = p.h == '@file unregister-leo.leox'
        path = self.integController.g.fullPath(c, p)
        has_changed = self.has_changed(c, path)
        if trace:
            self.integController.g.trace('changed', has_changed, p.h)
        if has_changed:
            self.lastPNode = p  # can be set here because its the same process for ask/warn
            if p.isAtAsisFileNode() or p.isAtNoSentFileNode():
                # Fix #1081: issue a warning.
                self.warn(c, path, p=p)
            elif self.ask(c, path, p=p):
                self.lastCommander.selectPosition(self.lastPNode)
                c.refreshFromDisk()

            # Always update the path & time to prevent future warnings.
            self.set_time(path)
            self.checksum_d[path] = self.checksum(path)

    def integResult(self, p_result):
        '''Received result from vsCode'''
        # Got the result to an asked question/warning from vscode
        if not self.waitingForAnswer:
            print("ERROR: Received Result but no Asked Dialog")
            return
        # check if p_resultwas from a warn (ok) or an ask ('yes','yes-all','no','no-all')
        # act accordingly

        path = self.integController.g.fullPath(self.lastCommander, self.lastPNode)

        # 1- if ok, unblock 'warn'
        # 2- if no, unblock 'ask'
        # ------------------------------------------ Nothing special to do

        # 3- if noAll, set noAll, and unblock 'ask'
        if p_result and "-all" in p_result.lower():
            self.yesno_all_time = time.time()
            self.yesno_all_answer = p_result.lower()
        # ------------------------------------------ Also covers setting yesAll in #5

        # 4- if yes, REFRESH self.lastPNode, and unblock 'ask'
        # 5- if yesAll,REFRESH self.lastPNode, set yesAll, and unblock 'ask'
        if bool(p_result and 'yes' in p_result.lower()):
            self.lastCommander.selectPosition(self.lastPNode)
            self.lastCommander.refreshFromDisk()

        # Always update the path & time to prevent future warnings for this PNode.
        self.set_time(path)
        self.checksum_d[path] = self.checksum(path)

        self.waitingForAnswer = False  # unblock
        self.idle_check_commander(self.lastCommander)  # unblock: run the loop as if timer had hit

    def ask(self, c, path, p=None):
        '''
        Ask user whether to overwrite an @<file> tree.
        Return True if the user agrees.
        '''
        # check with leoInteg's config first
        if self.integController.leoIntegConfig:
            w_check_config = self.integController.leoIntegConfig["defaultReloadIgnore"].lower()
            if not bool('none' in w_check_config):
                if bool('yes' in w_check_config):
                    self.infoMessage = "refreshed"
                    return True
                else:
                    self.infoMessage = "ignored"
                    return False
        # let original function resolve

        if self.yesno_all_time + 3 >= time.time() and self.yesno_all_answer:
            self.yesno_all_time = time.time()  # Still reloading?  Extend time.
            # if yesAll/noAll forced, then just show info message
            w_yesno_all_bool = bool('yes' in self.yesno_all_answer.lower())

            return w_yesno_all_bool
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

        w_package = {"async": "ask", "ask": 'Overwrite the version in Leo?',
                     "message": s, "yes_all": not _is_leo, "no_all": not _is_leo}

        self.integController.sendAsyncOutput(w_package)
        self.waitingForAnswer = True
        return False
        # result = self.integController.g.app.gui.runAskYesNoDialog(c, 'Overwrite the version in Leo?', s,
        # yes_all=not _is_leo, no_all=not _is_leo)

        # if result and "-all" in result.lower():
        # self.yesno_all_time = time.time()
        # self.yesno_all_answer = result.lower()

        # return bool(result and 'yes' in result.lower())

    def checksum(self, path):
        '''Return the checksum of the file at the given path.'''
        import hashlib
        return hashlib.md5(open(path, 'rb').read()).hexdigest()

    def get_mtime(self, path):
        '''Return the modification time for the path.'''
        return self.integController.g.os_path_getmtime(self.integController.g.os_path_realpath(path))

    def get_time(self, path):
        '''
        return timestamp for path

        see set_time() for notes
        '''
        return self._time_d.get(self.integController.g.os_path_realpath(path))

    def has_changed(self, c, path):
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

    def is_enabled(self, c):
        '''Return the cached @bool check_for_changed_external_file setting.'''
        # check with leoInteg's config first
        if self.integController.leoIntegConfig:
            w_check_config = self.integController.leoIntegConfig["checkForChangeExternalFiles"].lower()
            if bool('check' in w_check_config):
                return True
            if bool('ignore' in w_check_config):
                return False
        # let original function resolve
        d = self.enabled_d
        val = d.get(c)
        if val is None:
            val = c.config.getBool('check-for-changed-external-files', default=False)
            d[c] = val
        return val

    def join(self, s1, s2):
        '''Return s1 + ' ' + s2'''
        return f"{s1} {s2}"

    def set_time(self, path, new_time=None):
        '''
        Implements c.setTimeStamp.

        Update the timestamp for path.

        NOTE: file paths with symbolic links occur with and without those links
        resolved depending on the code call path.  This inconsistency is
        probably not Leo's fault but an underlying Python issue.
        Hence the need to call realpath() here.
        '''

        # print("called set_time for " + str(path))

        t = new_time or self.get_mtime(path)
        self._time_d[self.integController.g.os_path_realpath(path)] = t

    def warn(self, c, path, p):
        '''
        Warn that an @asis or @nosent node has been changed externally.

        There is *no way* to update the tree automatically.
        '''
        # check with leoInteg's config first
        if self.integController.leoIntegConfig:
            w_check_config = self.integController.leoIntegConfig["defaultReloadIgnore"].lower()

            if w_check_config != "none":
                # if not 'none' then do not warn, just infoMessage 'warn' at most
                if not self.infoMessage:
                    self.infoMessage = "warn"
                return

        # let original function resolve
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

        w_package = {"async": "warn", "warn": 'External file changed', "message": s}

        self.integController.sendAsyncOutput(w_package)
        self.waitingForAnswer = True

    # Some methods are called in the usual (non-leoBridge without 'efc') save process.
    # Those may called by the 'save' function, like check_overwrite,
    # or by any other functions from the instance of leo.core.leoBridge that's running.

    def open_with(self, c, d):
        return

    def check_overwrite(self, c, fn):
        # print("check_overwrite!! ")
        return True

    def shut_down(self):
        return

    def destroy_frame(self, f):
        return


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

        # * Trace outputs to pythons stdout, also prints the function call stack
        # self.g.trace('test trace')

        # * Intercept Log Pane output: Sends to vsCode's log pane
        self.g.es = self.es  # pointer - not a function call

        # print(dir(self.g))
        self.currentActionId = 1  # Id of action being processed, STARTS AT 1 = Initial 'ready'
        # self.commander = None  # going to store the leo file commander once its opened from leo.core.leoBridge
        self.leoIntegConfig = None
        self.webSocket = None
        self.loop = None

        self.g.IdleTime = self._idleTime
        self.g.app.idleTimeManager = IdleTimeManager(self.g)
        self.g.app.commanders = self._commanders

        self.efc = ExternalFilesController(self)

        # attach instance to g.app for calls to set_time, etc.
        self.g.app.externalFilesController = self.efc

    def _commanders(self):
        ''' Return list of currently active controllers '''
        # TODO : REVISE/REPLACE WITH OWN SYSTEM
        # return [f.c for f in g.app.windowList]
        return [self.commander]

    async def _asyncIdleLoop(self, p_seconds, p_fn):
        while True:
            await asyncio.sleep(p_seconds)
            p_fn(self)

    def _idleTime(self, fn, delay, tag):
        # TODO : REVISE/REPLACE WITH OWN SYSTEM
        asyncio.get_event_loop().create_task(self._asyncIdleLoop(delay/1000, fn))

    def sendAsyncOutput(self, p_package):
        if "async" not in p_package:
            print('[sendAsyncOutput] Error async member missing in package parameter' + json.dumps(p_package, separators=(',', ':')))
            return
        if self.loop:
            self.loop.create_task(self.asyncOutput(json.dumps(p_package, separators=(',', ':'))))
        else:
            print('[sendAsyncOutput] Error loop not ready' + json.dumps(p_package, separators=(',', ':')))

    def askResult(self, p_result):
        '''Got the result to an asked question/warning from vscode'''
        self.efc.integResult(p_result)
        return self.sendLeoBridgePackage()  # Just send empty as 'ok'

    def applyConfig(self, p_config):
        '''Got leoInteg's config from vscode'''
        self.leoIntegConfig = p_config
        return self.sendLeoBridgePackage()  # Just send empty as 'ok'

    def logSignon(self):
        '''Simulate the Initial Leo Log Entry'''
        if self.loop:
            self.g.app.computeSignon()
            self.g.es(str(self.g.app.signon))
            self.g.es(str(self.g.app.signon1))
        else:
            print('no loop in logSignon')

    def es(self, * args, **keys):
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
        w_package = {"async": "log", "log": s}
        self.sendAsyncOutput(w_package)

    def initConnection(self, p_webSocket):
        self.webSocket = p_webSocket
        self.loop = asyncio.get_event_loop()

    def openFile(self, p_file):
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

    def closeFile(self, p_paramUnused):
        '''Closes a leo file. A file can then be opened with "openFile"'''
        print("Trying to close opened file")
        if(self.commander):
            self.commander.close()
        return self.sendLeoBridgePackage()  # Just send empty as 'ok'

    def saveFile(self, p_paramUnused):
        '''Saves the leo file. New or dirty derived files are rewritten'''
        if(self.commander):
            try:
                self.commander.save()
            except Exception as e:
                self.g.trace('Error while saving')
                print("Error while saving")
                print(str(e))

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
                return self.outputPNode(self.commander.p)  # return selected node when done (not w_p)
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
                return self.outputPNode(self.commander.p)  # return selected node when done (not w_p)
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
        return self.outputPNode(self.commander.p)  # return selected node when done

    def redo(self, p_paramUnused):
        '''Undo last un-doable operation'''
        if(self.commander.undoer.canRedo()):
            self.commander.undoer.redo()
        return self.outputPNode(self.commander.p)  # return selected node when done

    def refreshFromDiskPNode(self, p_ap):
        '''Refresh from Disk, don't select it if possible'''
        return self.outlineCommand("refreshFromDisk", p_ap, True)

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

    def contractAll(self, p_paramUnused):
        '''(Collapse) Contract All'''
        self.commander.contractAllHeadlines()
        return self.outputPNode(self.commander.p)  # return selected node when done

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
        if p.isAnyAtFileNode():
            w_ap['atFile'] = True
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

    # * start Server
    integController = leoBridgeIntegController()

    # * This is a basic example loop
    # async def asyncInterval(timeout):
    #     dummyCounter = 0
    #     strTimeout = str(timeout) + ' sec interval'
    #     while True:
    #         await asyncio.sleep(timeout)
    #         dummyCounter = dummyCounter+1
    #         await integController.asyncOutput("{\"interval\":" + str(timeout+dummyCounter) + "}")  # as number
    #         print(strTimeout)

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
    # localLoop.create_task(asyncInterval(5)) # Starts a test loop of async communication
    localLoop.run_until_complete(start_server)
    print("LeoBridge started at " + wsHost + " on port: " + str(wsPort) + " [ctrl+c] to break", flush=True)
    localLoop.run_forever()
    print("Stopping leobridge server")


if __name__ == '__main__':
    # Startup
    try:
        main()
    except KeyboardInterrupt:
        print("\nKeyboard Interupt: Stopping leobridge server")
        sys.exit()
