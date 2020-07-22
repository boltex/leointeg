#! python3
import leo.core.leoBridge as leoBridge
import leo.core.leoNodes as leoNodes
import asyncio
import getopt
import json
import os.path
import sys
import time
import traceback
import websockets
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
        # Fix for flushing the terminal console to traverse
        # python through node.js when using start server in leoInteg
        sys.stdout.flush()

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
    # Those may be called by the 'save' function, like check_overwrite,
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


class LeoBridgeIntegController:
    '''Leo Bridge Controller'''

    def __init__(self):
        # TODO : @boltex #74 need gnx_to_vnode for each opened file/commander
        self.gnx_to_vnode = []  # utility array - see leoflexx.py in leoPluginsRef.leo
        self.bridge = leoBridge.controller(
            gui='nullGui',
            loadPlugins=True,   # True: attempt to load plugins.
            readSettings=True,  # True: read standard settings files.
            silent=True,        # True: don't print signon messages.
            verbose=False,      # True: prints messages that would be sent to the log pane.
        )
        self.g = self.bridge.globals()

        # * Trace outputs to pythons stdout, also prints the function call stack
        # self.g.trace('test trace')

        # * Intercept Log Pane output: Sends to vsCode's log pane
        self.g.es = self.es  # pointer - not a function call

        # print(dir(self.g))
        self.currentActionId = 1  # Id of action being processed, STARTS AT 1 = Initial 'ready'

        # * Currently Selected Commander (opened from leo.core.leoBridge or chosen via the g.app.windowList frame list)
        self.commander = None

        self.leoIntegConfig = None
        self.webSocket = None
        self.loop = None

        # * Replacement instances to Leo's codebase : IdleTime, idleTimeManager and externalFilesController
        self.g.IdleTime = self._idleTime
        self.g.app.idleTimeManager = IdleTimeManager(self.g)
        # attach instance to g.app for calls to set_time, etc.
        self.g.app.externalFilesController = ExternalFilesController(self)
        # TODO : Maybe use those yes/no replacement right before actual usage instead of in init. (to allow re-use/switching)
        self.g.app.gui.runAskYesNoDialog = self._returnYes  # override for "revert to file" operation

        # * setup leoBackground to get messages from leo
        try:
            self.g.app.idleTimeManager.start()  # To catch derived file changes
        except Exception:
            print('ERROR with idleTimeManager')

    async def _asyncIdleLoop(self, p_seconds, p_fn):
        while True:
            await asyncio.sleep(p_seconds)
            p_fn(self)

    def _returnNo(self, *arguments):
        '''Used to override g.app.gui.ask[XXX] dialogs answers'''
        return "no"

    def _returnYes(self, *arguments):
        '''Used to override g.app.gui.ask[XXX] dialogs answers'''
        return "yes"

    def _idleTime(self, fn, delay, tag):
        # TODO : REVISE/REPLACE WITH OWN SYSTEM
        asyncio.get_event_loop().create_task(self._asyncIdleLoop(delay/1000, fn))

    def _getTotalOpened(self):
        '''Get total of opened commander (who have closed == false)'''
        w_total = 0
        for w_commander in self.g.app.commanders():
            if not w_commander.closed:
                w_total = w_total + 1
        return w_total

    def _getFirstOpenedCommander(self):
        '''Get first opened commander, or False if there are none.'''
        for w_commander in self.g.app.commanders():
            if not w_commander.closed:
                return w_commander
        return False

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
        self.g.app.externalFilesController.integResult(p_result)
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

    def getOpenedFiles(self, p_package):
        '''Return array of opened file path/names to be used as openFile parameters to switch files'''
        w_files = []
        w_index = 0
        w_indexFound = 0
        for w_commander in self.g.app.commanders():
            if not w_commander.closed:
                w_isSelected = False
                w_isChanged = w_commander.changed
                if self.commander == w_commander:
                    w_indexFound = w_index
                    w_isSelected = True
                w_entry = {"name": w_commander.mFileName, "index": w_index,
                           "changed": w_isChanged, "selected": w_isSelected}
                w_files.append(w_entry)
                w_index = w_index + 1

        w_openedFiles = {"files": w_files, "index": w_indexFound}

        return self.sendLeoBridgePackage("openedFiles", w_openedFiles)

    def setOpenedFile(self, p_package):
        '''Choose the new active commander from array of opened file path/names by numeric index'''
        w_openedCommanders = []

        for w_commander in self.g.app.commanders():
            if not w_commander.closed:
                w_openedCommanders.append(w_commander)

        w_index = p_package['index']

        if w_openedCommanders[w_index]:
            self.commander = w_openedCommanders[w_index]

        if self.commander:
            self.commander.closed = False
            self.create_gnx_to_vnode()
            w_result = {"total": self._getTotalOpened(), "filename": self.commander.fileName(),
                        "node": self.p_to_ap(self.commander.p)}
            return self.sendLeoBridgePackage("setOpened", w_result)
        else:
            return self.outputError('Error in setOpenedFile')

    def openFile(self, p_file):
        """
        Open a leo file via leoBridge controller, or create a new document if empty string.
        Returns an object that contains a 'opened' member.
        """
        w_found = False

        # If not empty string (asking for New file) then check if already opened
        if p_file:
            for w_commander in self.g.app.commanders():
                if w_commander.fileName() == p_file:
                    w_found = True
                    self.commander = w_commander

        if not w_found:
            self.commander = self.bridge.openLeoFile(p_file)  # create self.commander

        # Leo at this point has done this too: g.app.windowList.append(c.frame)
        # and so this now app.commanders() yields this: return [f.c for f in g.app.windowList]

        # did this add to existing array of g.app.commanders() ?
        # print(*self.g.app.commanders(), sep='\n')

        if self.commander:
            self.commander.closed = False
            self.create_gnx_to_vnode()
            w_result = {"total": self._getTotalOpened(), "filename": self.commander.fileName(),
                        "node": self.p_to_ap(self.commander.p)}
            return self.sendLeoBridgePackage("opened", w_result)
        else:
            return self.outputError('Error in openFile')

    def openFiles(self, p_package):
        """
        Opens an array of leo files
        Returns an object that contains the last 'opened' member.
        """
        w_files = []
        if "files" in p_package:
            w_files = p_package["files"]

        for i_file in w_files:
            w_found = False
            # If not empty string (asking for New file) then check if already opened
            if i_file:
                for w_commander in self.g.app.commanders():
                    if w_commander.fileName() == i_file:
                        w_found = True
                        self.commander = w_commander

            if not w_found:
                if os.path.isfile(i_file):
                    self.commander = self.bridge.openLeoFile(i_file)  # create self.commander
            if self.commander:
                self.commander.closed = False

        # Done with the last one, it's now the selected commander. Check again just in case.
        if self.commander:
            self.commander.closed = False
            self.create_gnx_to_vnode()
            w_result = {"total": self._getTotalOpened(), "filename": self.commander.fileName(),
                        "node": self.p_to_ap(self.commander.p)}
            return self.sendLeoBridgePackage("opened", w_result)
        else:
            return self.outputError('Error in openFiles')

    def closeFile(self, p_package):
        """
        Closes a leo file. A file can then be opened with "openFile"
        Returns an object that contains a 'closed' member
        """
        # TODO : Specify which file to support multiple opened files
        if self.commander:
            if p_package["forced"] and self.commander.changed:
                # return "no" g.app.gui.runAskYesNoDialog  and g.app.gui.runAskYesNoCancelDialog
                self.commander.revert()
            if p_package["forced"] or not self.commander.changed:
                self.commander.closed = True
                self.commander.close()
            else:
                return self.sendLeoBridgePackage('closed', False)  # Cannot close, ask to save, ignore or cancel

        # Switch commanders to first available
        w_total = self._getTotalOpened()
        if w_total:
            self.commander = self._getFirstOpenedCommander()
        else:
            self.commander = None

        if self.commander:
            self.create_gnx_to_vnode()
            w_result = {"total": self._getTotalOpened(), "filename": self.commander.fileName(),
                        "node": self.p_to_ap(self.commander.p)}
            return self.sendLeoBridgePackage("closed", w_result)
        else:
            w_result = {"total": 0}
            return self.sendLeoBridgePackage("closed", w_result)

    def saveFile(self, p_package):
        '''Saves the leo file. New or dirty derived files are rewritten'''
        if self.commander:
            try:
                if "text" in p_package:
                    self.commander.save(fileName=p_package['text'])
                else:
                    self.commander.save()
            except Exception as e:
                self.g.trace('Error while saving')
                print("Error while saving")
                print(str(e))

        return self.sendLeoBridgePackage()  # Just send empty as 'ok'

    def getStates(self, p_package):
        """
        Gets the currently opened file's general states for UI enabled/disabled states
        such as undo available, file changed/unchanged
        """
        w_states = {}
        if self.commander:
            try:
                w_states["changed"] = self.commander.changed   # 'dirty/changed' member
                w_states["canUndo"] = self.commander.canUndo()
                w_states["canRedo"] = self.commander.canRedo()
                w_states["canDemote"] = self.commander.canDemote()
                w_states["canPromote"] = self.commander.canPromote()
                w_states["canDehoist"] = self.commander.canDehoist()

            except Exception as e:
                self.g.trace('Error while getting states')
                print("Error while getting states")
                print(str(e))
        else:
            w_states["changed"] = False
            w_states["canUndo"] = False
            w_states["canRedo"] = False
            w_states["canDemote"] = False
            w_states["canPromote"] = False
            w_states["canDehoist"] = False

        return self.sendLeoBridgePackage("states", w_states)

    def getButtons(self, p_package):
        '''Gets the currently opened file's @buttons list'''
        w_buttons = []
        if self.commander.theScriptingController and self.commander.theScriptingController.buttonsDict:
            w_dict = self.commander.theScriptingController.buttonsDict
            for w_key in w_dict:
                w_entry = {"name": w_dict[w_key], "index": str(w_key)}
                w_buttons.append(w_entry)
        return self.sendLeoBridgePackage("buttons", w_buttons)

    def removeButton(self, p_package):
        '''Removes an entry from the buttonsDict by index string'''
        w_index = p_package['index']
        w_dict = self.commander.theScriptingController.buttonsDict
        w_key = None
        for i_key in w_dict:
            if(str(i_key) == w_index):
                w_key = i_key
        if w_key:
            del(w_dict[w_key])  # delete object member
        return self.outputPNode(self.commander.p)  # return selected node when done

    def clickButton(self, p_package):
        '''Handles buttons clicked in vscode from the '@button' panel'''
        w_index = p_package['index']
        w_dict = self.commander.theScriptingController.buttonsDict
        w_button = None
        for i_key in w_dict:
            if(str(i_key) == w_index):
                w_button = i_key
        if w_button:
            w_button.command()  # run clicked button command
        return self.outputPNode(self.commander.p)  # return selected node when done

    def getCommands(self, p_package):
        """return a list of all commands."""
        c = self.commander
            # To do: return only commands that make sense in vs-code.
        if 0:
            # Testing. This works: keys are command names, values are functions.
            d = {
                'clone-find-all-marked': c.cloneFindAllMarked,
                'hoist': c.hoist,
                'dehoist': c.dehoist,
                'git-diff': c.editFileCommands.gitDiff,
            }
        else:
            d = c.commandsDict  # keys are command names, values are functions.
        result = []
        for command_name in list(set(d)):  # Weird. Dict keys should be distinct ????
            func = d.get(command_name)
            if not func:
                print('no func:', command_name, flush=True)
                continue
            # Prefer func.__func_name__ to func.__name__: Leo's decorators change func.__name__!
            func_name = getattr(func, '__func_name__', func.__name__)
            if not func_name:
                print('no func_name', command_name, flush=True)
                continue
            doc = func.__doc__ or ''
            result.append({
                "command_name": command_name, # New, recommended for minibuffer display.
                "label":  func_name, # should be function_name ?
                "detail": doc,
            })
            # This shows up in the bridge log.
            # print(f"__doc__: {len(doc):4} {command_name:40} {func_name} ", flush=True)
            print(f"{func_name} ", flush=True)
        
        return self.sendLeoBridgePackage("commands", result)
    def _getDocstringForCommand(self, command_name):
        """get docstring for the given command."""
        func = self._get_commander_method(command_name)
        docstring = func.__doc__ if func else ''
        return docstring

    def setActionId(self, p_id):
        self.currentActionId = p_id

    async def asyncOutput(self, p_json):
        '''Output json string to the websocket'''
        if self.webSocket:
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

    def pageUp(self, p_ap):
        """Selects a node a couple of steps up in the tree to simulate page up"""
        self.commander.selectVisBack()
        self.commander.selectVisBack()
        self.commander.selectVisBack()
        return self.outputPNode(self.commander.p)

    def pageDown(self, p_ap):
        """Selects a node a couple of steps down in the tree to simulate page down"""
        self.commander.selectVisNext()
        self.commander.selectVisNext()
        self.commander.selectVisNext()
        return self.outputPNode(self.commander.p)

    def gotoFirstVisible(self, p_ap):
        """Select the first visible node of the selected chapter or hoist."""
        return self.leoCommand("goToFirstVisibleNode", p_ap)

    def gotoLastVisible(self, p_ap):
        """Select the last visible node of selected chapter or hoist."""
        return self.leoCommand("goToLastVisibleNode", p_ap)

    def gotoLastSibling(self, p_ap):
        """Select the last sibling of the selected node."""
        return self.leoCommand("goToLastSibling", p_ap)

    def gotoNextVisible(self, p_ap):
        """Select the visible node following the presently selected node."""
        return self.leoCommand("selectVisNext", p_ap)

    def gotoPrevVisible(self, p_ap):
        """Select the visible node preceding the presently selected node."""
        return self.leoCommand("selectVisBack", p_ap)

    def gotoNextMarked(self, p_ap):
        """Select the next marked node."""
        return self.leoCommand("goToNextMarkedHeadline", p_ap)

    def gotoNextClone(self, p_ap):
        """
        Select the next node that is a clone of the selected node.
        If the selected node is not a clone, do find-next-clone.
        """
        return self.leoCommand("goToNextClone", p_ap)

    def contractOrGoLeft(self, p_ap):
        """Simulate the left Arrow Key in folder of Windows Explorer."""
        return self.leoCommand("contractNodeOrGoToParent", p_ap)

    def expandAndGoRight(self, p_ap):
        """If a node has children, expand it if needed and go to the first child."""
        return self.leoCommand("expandNodeAndGoToFirstChild", p_ap)

    def markPNode(self, p_ap):
        '''Mark a node, don't select it'''
        if p_ap:
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
        if p_ap:
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
        if p_ap:
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    return self.leoCommand("clone", p_ap, False)
                else:
                    return self.leoCommand("clone", p_ap, True)
            else:
                return self.outputError("Error in clonePNode function, no w_p node found")  # default empty
        else:
            return self.outputError("Error in clonePNode function, no param p_ap")

    def copyPNode(self, p_ap):
        '''Copy a node, don't select it'''
        return self.leoCommand("copyOutline", p_ap, True)

    def cutPNode(self, p_ap):
        '''Cut a node, don't select it'''
        return self.leoCommand("cutOutline", p_ap, True)

    def pastePNode(self, p_ap):
        '''Paste a node, don't select it if possible'''
        return self.leoCommand("pasteOutline", p_ap, True)

    def pasteAsClonePNode(self, p_ap):
        '''Paste as clone, don't select it if possible'''
        return self.leoCommand("pasteOutlineRetainingClones", p_ap, True)

    def deletePNode(self, p_ap):
        '''Delete a node, don't select it. Try to keep selection, then return the selected node that remains'''
        if p_ap:
            w_p = self.ap_to_p(p_ap)
            if w_p:
                if w_p == self.commander.p:
                    self.commander.deleteOutline()  # already on this node, so delete it
                else:
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
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in deletePNode no w_p node found")  # default empty
        else:
            return self.outputError("Error in deletePNode no param p_ap")

    def movePNodeDown(self, p_ap):
        '''Move a node DOWN, don't select it if possible'''
        return self.leoCommand("moveOutlineDown", p_ap, True)

    def movePNodeLeft(self, p_ap):
        '''Move a node LEFT, don't select it if possible'''
        return self.leoCommand("moveOutlineLeft", p_ap, True)

    def movePNodeRight(self, p_ap):
        '''Move a node RIGHT, don't select it if possible'''
        return self.leoCommand("moveOutlineRight", p_ap, True)

    def movePNodeUp(self, p_ap):
        '''Move a node UP, don't select it if possible'''
        return self.leoCommand("moveOutlineUp", p_ap, True)

    def insertPNode(self, p_ap):
        '''Insert a node at given node, then select it once created, and finally return it'''
        if p_ap:
            w_p = self.ap_to_p(p_ap)
            if w_p:
                w_bunch = self.commander.undoer.beforeInsertNode(w_p)
                w_newNode = w_p.insertAfter()
                w_newNode.setDirty()
                self.commander.undoer.afterInsertNode(w_newNode, 'Insert Node', w_bunch)
                self.commander.selectPosition(w_newNode)
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in insertPNode no w_p node found")  # default empty
        else:
            return self.outputError("Error in insertPNode no param p_ap")

    def insertNamedPNode(self, p_package):
        '''Insert a node at given node, set its headline, select it and finally return it'''
        w_newHeadline = p_package['text']
        w_ap = p_package['node']
        if w_ap:
            w_p = self.ap_to_p(w_ap)
            if w_p:
                w_u = self.commander.undoer.beforeInsertNode(w_p)
                w_newNode = w_p.insertAfter()
                # set this node's new headline
                w_newNode.h = w_newHeadline
                w_newNode.setDirty()
                self.commander.undoer.afterInsertNode(w_newNode, 'Insert Node', w_u)
                self.commander.selectPosition(w_newNode)
                return self.outputPNode(self.commander.p)  # in any case, return selected node
            else:
                return self.outputError("Error in insertNamedPNode no w_p node found")  # default empty
        else:
            return self.outputError("Error in insertNamedPNode no param w_ap")

    def promotePNode(self, p_ap):
        '''Promote a node, don't select it if possible'''
        return self.leoCommand("promote", p_ap, True)

    def demotePNode(self, p_ap):
        '''Demote a node, don't select it if possible'''
        return self.leoCommand("demote", p_ap, True)

    def sortChildrenPNode(self, p_ap):
        '''Sort children of a node, don't select it if possible'''
        return self.leoCommand("sortChildren", p_ap, True)

    def sortSiblingsPNode(self, p_ap):
        '''Sort siblings of a node, don't select it if possible'''
        return self.leoCommand("sortSiblings", p_ap, True)

    def hoistPNode(self, p_ap):
        '''Select and Hoist a node'''
        return self.leoCommand("hoist", p_ap)  # Don't try to re-select node

    def deHoist(self, p_paramUnused):
        '''De-Hoist'''
        self.commander.dehoist()
        return self.outputPNode(self.commander.p)  # in any case, return selected node

    def _get_commander_method(self, p_command):
        """ Return the given method (p_command) in the Commands class or subcommanders."""
        # self.g.trace(p_command)
        #
        # First, try the commands class.
        w_func = getattr(self.commander, p_command, None)
        if w_func:
            return w_func
        #
        # Search all subcommanders for the method.
        table = (  # This table comes from c.initObjectIvars.
            'abbrevCommands',
            'bufferCommands',
            'chapterCommands',
            'controlCommands',
            'convertCommands',
            'debugCommands',
            'editCommands',
            'editFileCommands',
            'evalController',
            'gotoCommands',
            'helpCommands',
            'keyHandler',
            'keyHandlerCommands',
            'killBufferCommands',
            'leoCommands',
            'leoTestManager',
            'macroCommands',
            'miniBufferWidget',
            'printingController',
            'queryReplaceCommands',
            'rectangleCommands',
            'searchCommands',
            'spellCommands',
            'vimCommands',  # Not likely to be useful.
        )
        for ivar in table:
            subcommander = getattr(self.commander, ivar, None)
            if subcommander:
                w_func = getattr(subcommander, p_command, None)
                if w_func:
                    ### self.g.trace(f"Found c.{ivar}.{p_command}")
                    return w_func
            # else:
                # self.g.trace(f"Not Found: c.{ivar}") # Should never happen.
        return None

    def leoCommand(self, p_command, p_ap, p_keepSelection=False, p_byName=False):
        '''
        Generic call to a method in Leo's Commands class or any subcommander class.

        The p_ap position node is to be selected before having the command run,
        while the p_keepSelection parameter specifies wether the original position should be re-selected.
        The whole of those operations is to be undoable as one undo step.

        p_command: a method name (a string).
        p_ap: an archived position.
        p_keepSelection: preserve the current selection, if possible.
        '''
        if not p_ap:
            return self.outputError(f"Error in {p_command}: no param p_ap")
        w_p = self.ap_to_p(p_ap)
        if not w_p:
            return self.outputError(f"Error in {p_command}: no w_p node found")
        w_func = self._get_commander_method(p_command)
        if not w_func:
            return self.outputError(f"Error in {p_command}: no method found")

        if w_p == self.commander.p:
            w_func(event=None)
        else:
            oldPosition = self.commander.p
            self.commander.selectPosition(w_p)
            w_func(event=None)
            if p_keepSelection and self.commander.positionExists(oldPosition):
                self.commander.selectPosition(oldPosition)
        return self.outputPNode(self.commander.p)

    def undo(self, p_paramUnused):
        '''Undo last un-doable operation'''
        if self.commander.undoer.canUndo():
            self.commander.undoer.undo()
        return self.outputPNode(self.commander.p)  # return selected node when done

    def redo(self, p_paramUnused):
        '''Undo last un-doable operation'''
        if self.commander.undoer.canRedo():
            self.commander.undoer.redo()
        return self.outputPNode(self.commander.p)  # return selected node when done

    def refreshFromDiskPNode(self, p_ap):
        '''Refresh from Disk, don't select it if possible'''
        return self.leoCommand("refreshFromDisk", p_ap, True)

    def executeScript(self, p_package):
        '''Select a node and run its script'''
        if 'node' in p_package:
            w_ap = p_package['node']
            w_p = self.ap_to_p(w_ap)
            if w_p:
                self.commander.selectPosition(w_p)
                w_script = ""
                if 'text' in p_package:
                    w_script = str(p_package['text'])
                if w_script and not w_script.isspace():
                    # * Mimic getScript !!
                    try:
                        # Remove extra leading whitespace so the user may execute indented code.
                        w_script = self.g.removeExtraLws(w_script, self.commander.tab_width)
                        w_script = self.g.extractExecutableString(self.commander, w_p, w_script)
                        w_validScript = self.g.composeScript(self.commander, w_p, w_script,
                                                             forcePythonSentinels=True,
                                                             useSentinels=True)
                        self.commander.executeScript(script=w_validScript)
                    except Exception as e:
                        self.g.trace('Error while executing script')
                        print('Error while executing script')
                        print(str(e))
                else:
                    self.commander.executeScript()
                return self.outputPNode(self.commander.p)  # in both cases, return selected node
            else:
                return self.outputError("Error in run no w_p node found")  # default empty
        else:
            return self.outputError("Error in run no param p_ap")

    def getPNode(self, p_ap):
        '''EMIT OUT a node, don't select it'''
        if p_ap:
            w_p = self.ap_to_p(p_ap)
            if w_p:
                return self.outputPNode(w_p)
            else:
                return self.outputError("Error in getPNode no w_p node found")
        else:
            return self.outputError("Error in getPNode no param p_ap")

    def getChildren(self, p_ap):
        '''EMIT OUT list of children of a node'''
        if p_ap:
            w_p = self.ap_to_p(p_ap)
            if w_p and w_p.hasChildren():
                return self.outputPNodes(w_p.children())
            else:
                return self.outputPNodes([])  # default empty array
        else:
            if self.commander.hoistStack:
                return self.outputPNodes([self.commander.hoistStack[-1].p])
            else:
                return self.outputPNodes(self.yieldAllRootChildren())  # this outputs all Root Children

    def getParent(self, p_ap):
        '''EMIT OUT the parent of a node, as an array, even if unique or empty'''
        if p_ap:
            w_p = self.ap_to_p(p_ap)
            if w_p and w_p.hasParent():
                return self.outputPNode(w_p.getParent())
            else:
                return self.outputPNode()  # default empty for root
        else:
            return self.outputPNode()

    def getSelectedNode(self, p_paramUnused):
        '''EMIT OUT Selected Position as an array, even if unique'''
        if self.commander.p:
            return self.outputPNode(self.commander.p)
        else:
            return self.outputPNode()

    def getAllGnx(self, p_paramUnused):
        '''Get gnx array from all unique nodes'''
        w_all_gnx = [p.v.gnx for p in self.commander.all_unique_positions(copy=False)]
        return self.sendLeoBridgePackage("allGnx", w_all_gnx)

    def getBody(self, p_gnx):
        '''EMIT OUT body of a node'''
        if p_gnx:
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
        if p_gnx:
            w_v = self.commander.fileCommands.gnxDict.get(p_gnx)  # vitalije
            if w_v and w_v.b:
                return self.sendLeoBridgePackage("bodyLength", len(w_v.b))
            else:
                return self.sendLeoBridgePackage("bodyLength", 0)
        else:
            # TODO : May need to signal inexistent by self.sendLeoBridgePackage()  # empty as inexistent
            return self.sendLeoBridgePackage("bodyLength", 0)

    def setNewBody(self, p_body):
        '''Change Body of selected node'''
        # TODO : This method is unused for now? Remove if unnecessary.
        # TODO : Does this support 'Undo'?
        if self.commander.p:
            self.commander.p.b = p_body['body']
            return self.outputPNode(self.commander.p)
        else:
            return self.outputError("Error in setNewBody")

    def setBody(self, p_package):
        '''Change Body text of a node'''
        for w_p in self.commander.all_positions():
            if w_p.v.gnx == p_package['gnx']:  # found
                # TODO : Before setting undo and trying to set body, first check if different than existing body
                w_bunch = self.commander.undoer.beforeChangeNodeContents(w_p)  # setup undoable operation
                w_p.v.setBodyString(p_package['body'])
                self.commander.undoer.afterChangeNodeContents(w_p, "Body Text", w_bunch)
                if not self.commander.isChanged():
                    self.commander.setChanged()
                if not w_p.v.isDirty():
                    w_p.setDirty()
                break
        return self.sendLeoBridgePackage()  # Just send empty as 'ok'

    def setNewHeadline(self, p_package):
        '''Change Headline of a node'''
        w_newHeadline = p_package['text']
        w_ap = p_package['node']
        if w_ap:
            w_p = self.ap_to_p(w_ap)
            if w_p:
                # set this node's new headline
                w_bunch = self.commander.undoer.beforeChangeNodeContents(w_p)
                w_p.h = w_newHeadline
                self.commander.undoer.afterChangeNodeContents(w_p, 'Change Headline', w_bunch)
                return self.outputPNode(w_p)
        return self.outputError("Error in setNewHeadline")

    def setSelectedNode(self, p_ap):
        '''Select a node, or the first one found with its GNX'''
        if p_ap:
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
        if self.commander.p:
            return self.outputPNode(self.commander.p)
        else:
            return self.outputPNode()

    def expandNode(self, p_ap):
        '''Expand a node'''
        if p_ap:
            w_p = self.ap_to_p(p_ap)
            if w_p:
                w_p.expand()
        return self.sendLeoBridgePackage()  # Just send empty as 'ok'

    def collapseNode(self, p_ap):
        '''Collapse a node'''
        if p_ap:
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
        # t1 = time.process_time()
        qtyAllPositions = 0
        for p in self.commander.all_positions():
            qtyAllPositions += 1
            ap = self.p_to_ap(p)
            p2 = self.ap_to_p(ap)
            assert p == p2, (repr(p), repr(p2), repr(ap))
        gnx_to_vnode = old_d
        new_len = len(list(gnx_to_vnode.keys()))
        assert old_len == new_len, (old_len, new_len)
        # print('Leo file opened. Its outline contains ' + str(qtyAllPositions) + " nodes positions.")
        # print(('Testing app.test_round_trip_positions for all nodes: Total time: %5.3f sec.' % (time.process_time()-t1)))

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
        # TODO : Convert all those booleans into an 8 bit integer 'status' flag
        if p.v.u:
            w_ap['u'] = p.v.u
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
    print("Starting LeoBridge... (Launch with -h for help)", flush=True)
    # replace default host address and port if provided as arguments

    try:
        opts, args = getopt.getopt(sys.argv[1:], "ha:p:", ["help", "address=", "port="])
    except getopt.GetoptError:
        print('leobridgeserver.py -a <address> -p <port>')
        print('defaults to localhost on port 32125', flush=True)
        if args:
            print("unused args: " + str(args), flush=True)
        sys.exit(2)
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            print('leobridgeserver.py -a <address> -p <port>')
            print('defaults to localhost on port 32125', flush=True)
            sys.exit()
        elif opt in ("-a", "--address"):
            wsHost = arg
        elif opt in ("-p", "--port"):
            wsPort = arg

    # * start Server
    integController = LeoBridgeIntegController()

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
                    # print(f"action: {w_param['action']}", flush=True)
                    # * Storing id of action in global var instead of passing as parameter
                    integController.setActionId(w_param['id'])
                    # ! functions called this way need to accept at least a parameter other than 'self'
                    # ! See : getSelectedNode and getAllGnx
                    # TODO : Block attempts to call functions starting with underscore or reserved
                    #
                    func = getattr(integController, w_param['action'], None)
                    if func:
                        # Is Filtered by Leo Bridge Integration Controller
                        answer = func(w_param['param'])
                    else:
                        # Attempt to execute the command directly on the commander/subcommander
                        answer = integController.leoCommand(w_param['action'], w_param['param'], False)
                else:
                    answer = "Error in processCommand"
                    print(answer, flush=True)
                await websocket.send(answer)
        except websockets.exceptions.ConnectionClosedError:
            print("Websocket connection closed", flush=True)
        except Exception:
            print('Exception in leobridgeserver.py!', flush=True)
            # Like g.es_exception()...
            typ, val, tb = sys.exc_info()
            for line in traceback.format_exception(typ, val, tb):
                print(line.rstrip(), flush=True)
        finally:
            asyncio.get_event_loop().stop()

    localLoop = asyncio.get_event_loop()
    start_server = websockets.serve(leoBridgeServer, wsHost, wsPort)
    # localLoop.create_task(asyncInterval(5)) # Starts a test loop of async communication
    localLoop.run_until_complete(start_server)
    print("LeoBridge started at " + wsHost + " on port: " + str(wsPort) + " [ctrl+c] to break", flush=True)
    localLoop.run_forever()
    print("Stopping leobridge server", flush=True)


if __name__ == '__main__':
    # Startup
    try:
        main()
    except KeyboardInterrupt:
        print("\nKeyboard Interupt: Stopping leobridge server", flush=True)
        sys.exit()
