//@+leo-ver=5-thin
//@+node:ekr.20211016085907.2: * @file src/leoAtFile.ts
/*
 * Classes to read and write @file nodes.
 */
//@+<< imports >>
//@+node:ekr.20211016085907.3: ** << imports >> (leoAtFile.py)
// import io
// import os
// import re
// import sys
// import tabnanny
// import time
// import tokenize
// from typing import List
// from leo.core import leoGlobals as g
// from leo.core import leoNodes
import * as vscode from "vscode";
import * as utils from "./utils";
import { ConfigMembers, ConfigSetting, FontSettings } from "./types";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";
//@-<< imports >>
//@+others
//@+node:ekr.20211016085907.5: ** class AtFile
/*
 * A class implementing the atFile subcommander.
*/
classAtFile {
    //@+<< define class constants >>
    //@+node:ekr.20211016085907.6: *3* << define class constants >>
    /* directives... */
    noDirective     =  1  /* not an at-directive. */
    allDirective    =  2  /* at-all (4.2) */
    docDirective    =  3  /* @doc. */
    atDirective     =  4  /* @<space> or @<newline> */
    codeDirective   =  5  /* @code */
    cDirective      =  6  /* @c<space> or @c<newline> */
    othersDirective =  7  /* at-others */
    miscDirective   =  8  /* All other directives */
    rawDirective    =  9  /* @raw */
    endRawDirective = 10  /* @end_raw */
    startVerbatim   = 11  /* @verbatim  Not a real directive. Used to issue warnings. */
    //@-<< define class constants >>
    //@+others
    //@+node:ekr.20211016085907.7: *3* at.Birth & init
    //@+node:ekr.20211016085907.8: *4* at.constructor & helpers
    /*
     * ctor for atFile class.
     *
     * Note: g.getScript also calls at.__init__ and at.finishCreate().
     */
    public constructor(c: Commands): void {

        /*
         **Warning**: all these ivars must **also** be inited in initCommonIvars.
         */
        this.c = c
        this.encoding = 'utf-8'
        this.fileCommands = c.fileCommands
        this.errors = 0  /* Make sure at.error() works even when not inited. */
        
        /* Only at.writeAll manages these flags... */
        this.unchangedFiles = 0

        /* promptForDangerousWrite sets cancelFlag and yesToAll only if canCancelFlag is True. */
        this.canCancelFlag = False
        this.cancelFlag = False
        this.yesToAll = False

        /* User options: set in reloadSettings. */
        this.checkPythonCodeOnWrite = False
        this.runPyFlakesOnWrite = False
        this.underindentEscapeString = '\\-'
        this.reloadSettings()
    }
    //@+node:ekr.20211016085907.9: *5* at.reloadSettings
    public reloadSettings(): void {
        /* AtFile.reloadSettings */
        c = this.c
        this.checkPythonCodeOnWrite = c.config.getBool('check-python-code-on-write', default=True)
        this.runPyFlakesOnWrite = c.config.getBool('run-pyflakes-on-write', default=False)
        this.underindentEscapeString = c.config.getString('underindent-escape-string') or '\\-'
    }
    //@+node:ekr.20211016085907.10: *4* at.initCommonIvars
    /** 
     * Init ivars common to both reading and writing.
     *
     * The defaults set here may be changed later.
     */
    public initCommonIvars(): void {
        at = this
        c = at.c
        at.at_auto_encoding = c.config.default_at_auto_file_encoding
        at.encoding = c.config.default_derived_file_encoding
        at.endSentinelComment = ""
        at.errors = 0
        at.inCode = True
        at.indent = 0  /* The unit of indentation is spaces, not tabs. */
        at.language = None
        at.output_newline = g.getOutputNewline(c=c)
        at.page_width = None
        at.raw = False  /* True: in @raw mode */
        at.root = None  /* The root (a position) of tree being read or written. */
        at.startSentinelComment = ""
        at.startSentinelComment = ""
        at.tab_width = c.tab_width or -4
        at.writing_to_shadow_directory = False
    }
    //@+node:ekr.20211016085907.11: *4* at.initReadIvars
    public initReadIvars(root, fileName): void {
        at = this
        at.initCommonIvars()
        at.bom_encoding = None  /* The encoding implied by any BOM (set by g.stripBOM) */
        at.cloneSibCount = 0  /* n > 1: Make sure n cloned sibs exists at next @+node sentinel */
        at.correctedLines = 0  /* For perfect import. */
        at.docOut = []  /* The doc part being accumulated. */
        at.done = False  /* True when @-leo seen. */
        at.fromString = False
        at.importRootSeen = False
        at.indentStack = []
        at.lastLines = []  /* The lines after @-leo */
        at.leadingWs = ""
        at.lineNumber = 0  /* New in Leo 4.4.8. */
        at.out = None
        at.outStack = []
        at.read_i = 0
        at.read_lines = []
        at.readVersion = ''  /* "5" for new-style thin files. */
        at.readVersion5 = False  /* Synonym for at.readVersion >= '5' */
        at.root = root
        at.rootSeen = False
        at.targetFileName = fileName  /* For at.writeError only. */
        at.tnodeList = []  /* Needed until old-style @file nodes are no longer supported. */
        at.tnodeListIndex = 0
        at.v = None
        at.vStack = []  /* Stack of at.v values. */
        at.thinChildIndexStack = []  /* number of siblings at this level. */
        at.thinNodeStack = []  /* Entries are vnodes. */
        at.updateWarningGiven = False
    }
    //@+node:ekr.20211016085907.12: *4* at.initWriteIvars
    /** 
     * Compute default values of all write-related ivars.
     * Return the finalized name of the output file.
     */
    public initWriteIvars(root): void {

        at, c = this, this.c
        if (not c and c.config) {
            return None
        }
        make_dirs = c.config.create_nonexistent_directories
        assert root
        this.initCommonIvars()
        assert at.checkPythonCodeOnWrite is not None
        assert at.underindentEscapeString is not None
        
        /* Copy args */
        at.root = root
        at.sentinels = True

        /* Override initCommonIvars. */
        if (g.unitTesting) {
            at.output_newline = '\n'
        }

        /* Set other ivars... */
        
        /* For at.putBody only. */
        at.force_newlines_in_at_nosent_bodies = c.config.getBool('force-newlines-in-at-nosent-bodies')

        at.outputList = [] /* For stream output. */
        /* Sets the following ivars:
         * at.encoding, at.explicitLineEnding, at.language
         * at.output_newline, at.page_width, at.tab_width
         */
        at.scanAllDirectives(root)

        /* Overrides of at.scanAllDirectives... */
        if (at.language == 'python') {
            /* Encoding directive overrides everything else. */
            encoding = g.getPythonEncodingFromString(root.b)
            if (encoding) {
                at.encoding = encoding
            }
        }

        /* Clean root.v. */
        if (not at.errors and at.root) {
            if (hasattr(at.root.v, 'tnodeList')) {
                delattr(at.root.v, 'tnodeList')
            }
            at.root.v._p_changed = True
        }

        /* #1907: Compute the file name and create directories as needed. */
        targetFileName = g.os_path_realpath(g.fullPath(c, root))
        at.targetFileName = targetFileName  /* For at.writeError only. */

        /* targetFileName can be empty for unit tests & @command nodes. */
        if (not targetFileName) {
            targetFileName = root.h if g.unitTesting else None
            at.targetFileName = targetFileName  /* For at.writeError only. */
            return targetFileName
        }

        /* Do nothing more if the file already exists. */
        if (os.path.exists(targetFileName)) {
            return targetFileName
        }

        /* Create directories if enabled. */
        root_dir = g.os_path_dirname(targetFileName)
        if (make_dirs and root_dir) {
            ok = g.makeAllNonExistentDirectories(root_dir)
            if (not ok) {
                g.error(f"Error creating directories: {root_dir}")
                return None
            }
        }

        /* Return the target file name, regardless of future problems. */
        return targetFileName
    }
    //@+node:ekr.20211016085907.13: *3* at.Reading
    //@+node:ekr.20211016085907.14: *4* at.Reading (top level)
    //@+node:ekr.20211016085907.15: *5* at.checkExternalFile
    @cmd('check-external-file')
    public checkExternalFile(event=None): void {
        /* Make sure an external file written by Leo may be read properly. */
        c, p = this.c, this.c.p
        if (not p.isAtFileNode() and not p.isAtThinFileNode()) {
            g.red('Please select an @thin or @file node')
            return
        }
        fn = g.fullPath(c, p)  /* #1910. */
        if (not g.os_path_exists(fn)) {
            g.red(f"file not found: {fn}")
            return
        }
        s, e = g.readFileIntoString(fn)
        if (s is None) {
            g.red(f"empty file: {fn}")
            return
        }
        /*  */
        /* Create a dummy, unconnected, VNode as the root. */
        root_v = leoNodes.VNode(context=c)
        root = leoNodes.Position(root_v)
        FastAtRead(c, gnx2vnode={}).read_into_root(s, fn, root)
    }
    //@+node:ekr.20211016085907.16: *5* at.openFileForReading & helper
    public openFileForReading(fromString=False): void {
        /** 
         * Open the file given by at.root.
         * This will be the private file for @shadow nodes.
         */
        at, c = this, this.c
        is_at_shadow = this.root.isAtShadowFileNode()
        if (fromString) {
            if (is_at_shadow) {
                return at.error(
                    'can not call at.read from string for @shadow files')
            }
            at.initReadLine(fromString)
            return None, None
        }
        /*  */
        /* Not from a string. Carefully read the file. */
        fn = g.fullPath(c, at.root)
            /* Returns full path, including file name. */
        at.setPathUa(at.root, fn)
            /* Remember the full path to this node. */
        if (is_at_shadow) {
            fn = at.openAtShadowFileForReading(fn)
            if (not fn) {
                return None, None
            }
        }
        assert fn
        try {
            s = at.readFileToUnicode(fn)
                /* Sets at.encoding, regularizes whitespace and calls at.initReadLines. */
            /* #1466. */
            if (s is None) {
                /* The error has been given. */
                at._file_bytes = g.toEncodedString('')
                return None, None
            }
            at.warnOnReadOnlyFile(fn)
        }
        except (Exception) {
            at.error(f"unexpected exception opening: '@file {fn}'")
            at._file_bytes = g.toEncodedString('')
            fn, s = None, None
        }
        return fn, s
    }
    //@+node:ekr.20211016085907.17: *6* at.openAtShadowFileForReading
    public openAtShadowFileForReading(fn): void {
        /* Open an @shadow for reading and return shadow_fn. */
        at = this
        x = at.c.shadowController
        /* readOneAtShadowNode should already have checked these. */
        shadow_fn = x.shadowPathName(fn)
        shadow_exists = (g.os_path_exists(shadow_fn) and g.os_path_isfile(shadow_fn))
        if (not shadow_exists) {
            g.trace('can not happen: no private file',
                shadow_fn, g.callers())
            at.error(f"can not happen: private file does not exist: {shadow_fn}")
            return None
        }
        /* This method is the gateway to the shadow algorithm. */
        x.updatePublicAndPrivateFiles(at.root, fn, shadow_fn)
        return shadow_fn
    }
    //@+node:ekr.20211016085907.18: *5* at.read & helpers
    public read(root, fromString=None): void {
        /* Read an @thin or @file tree. */
        at, c = this, this.c
        fileName = g.fullPath(c, root)  /* #1341. #1889. */
        if (not fileName) {
            at.error("Missing file name. Restoring @file tree from .leo file.")
            return False
        }
        at.rememberReadPath(g.fullPath(c, root), root)
            /* Fix bug 760531: always mark the root as read, even if there was an error. */
            /* Fix bug 889175: Remember the full fileName. */
        at.initReadIvars(root, fileName)
        at.fromString = fromString
        if (at.errors) {
            return False
        }
        fileName, file_s = at.openFileForReading(fromString=fromString)
        /* #1798: */
        if (file_s is None) {
            return False
        }
        /*  */
        /* Set the time stamp. */
        if (fileName) {
            c.setFileTimeStamp(fileName)
        }
        else {
            if (not fileName and not fromString and not file_s) {
                return False
            }
        }
        root.clearVisitedInTree()
        at.scanAllDirectives(root)
            /* Sets the following ivars: */
                /* at.encoding: **changed later** by readOpenFile/at.scanHeader. */
                /* at.explicitLineEnding */
                /* at.language */
                /* at.output_newline */
                /* at.page_width */
                /* at.tab_width */
        gnx2vnode = c.fileCommands.gnxDict
        contents = fromString or file_s
        FastAtRead(c, gnx2vnode).read_into_root(contents, fileName, root)
        root.clearDirty()
        return True
    }
    //@+node:ekr.20211016085907.19: *6* at.deleteTnodeList
    public deleteTnodeList(p: Position): void { // # AtFile method.
        /* Remove p's tnodeList. */
        v = p.v
        if (hasattr(v, "tnodeList")) {
            /* Not an error, but a useful trace. */
                /* g.blue("deleting tnodeList for " + repr(v)) */
            delattr(v, "tnodeList")
            v._p_changed = True
        }
    }
    //@+node:ekr.20211016085907.20: *6* at.deleteUnvisitedNodes & helpers
    public deleteUnvisitedNodes(root, redraw=True): void {
        /** 
         * Delete unvisited nodes in root's subtree, not including root.
         *
         * Before Leo 5.6: Move unvisited node to be children of the 'Resurrected
         * Nodes'.
         */
        at = this
        /* Find the unvisited nodes. */
        aList = [z for z in root.subtree() if not z.isVisited()]
        if (aList) {
            /* new-read: Never create resurrected nodes. */
                /* r = at.createResurrectedNodesNode() */
                /* callback = at.defineResurrectedNodeCallback(r, root) */
                /* # Move the nodes using the callback. */
                /* at.c.deletePositionsInList(aList, callback) */
            at.c.deletePositionsInList(aList, redraw=redraw)
        }
    }
    //@+node:ekr.20211016085907.21: *7* createResurrectedNodesNode
    public createResurrectedNodesNode(): void {
        /* Create a 'Resurrected Nodes' node as the last top-level node. */
        c = this.c
        tag = 'Resurrected Nodes'
        /* Find the last top-level node. */
        last = c.rootPosition()
        while (last.hasNext()) {
            last.moveToNext()
        }
        /* Create the node after last if it doesn't exist. */
        if (last.h == tag) {
            p = last
        }
        else {
            p = last.insertAfter()
            p.setHeadString(tag)
        }
        p.expand()
        return p
    }
    //@+node:ekr.20211016085907.22: *7* defineResurrectedNodeCallback
    public defineResurrectedNodeCallback(r, root): void {
        /* Define a callback that moves node p as r's last child. */

        public callback(p: Position, r=r.copy(), root=root): void {
            /* The resurrected nodes callback. */
            child = r.insertAsLastChild()
            child.h = f"From {root.h}"
            v = p.v
            /* new code: based on vnodes. */
            for (parent_v in v.parents) {
                assert isinstance(parent_v, leoNodes.VNode), parent_v
                if (v in parent_v.children) {
                    childIndex = parent_v.children.index(v)
                    v._cutLink(childIndex, parent_v)
                    v._addLink(len(child.v.children), child.v)
                }
                else {
                    /* This would be surprising. */
                    g.trace('**already deleted**', parent_v, v)
                }
            }
            if (not g.unitTesting) {
                g.error('resurrected node:', v.h)
                g.blue('in file:', root.h)
            }
        }

        return callback
    }
    //@+node:ekr.20211016085907.23: *6* at.isFileLike
    public isFileLike(s: string): void {
        /* Return True if s has file-like sentinels. */
        at = this
        tag = "@+leo"
        s = g.checkUnicode(s)
        i = s.find(tag)
        if (i == -1) {
            return True  /* Don't use the cache. */
        }
        j, k = g.getLine(s, i)
        line = s[j:k]
        valid, new_df, start, end, isThin = at.parseLeoSentinel(line)
        return not isThin
    }
    //@+node:ekr.20211016085907.24: *5* at.readAll & helpers
    public readAll(root, force=False): void {
        /* Scan positions, looking for @<file> nodes to read. */
        at, c = this, this.c
        old_changed = c.changed
        if (force) {
            /* Capture the current headline only if */
            /* we aren't doing the initial read. */
            c.endEditing()
        }
        t1 = time.time()
        c.init_error_dialogs()
        files = at.findFilesToRead(force, root)
        for (p in files) {
            at.readFileAtPosition(force, p)
        }
        for (p in files) {
            p.v.clearDirty()
        }
        if (not g.unitTesting) {
            if (files) {
                t2 = time.time()
                g.es(f"read {len(files)} files in {t2 - t1:2.2f} seconds")
            }
            else {
                if (force) {
                    g.es("no @<file> nodes in the selected tree")
                }
            }
        }
        c.changed = old_changed
        c.raise_error_dialogs()
    }
    //@+node:ekr.20211016085907.25: *6* at.findFilesToRead
    public findFilesToRead(force, root): void {

        c = this.c
        p = root.copy()
        scanned_tnodes = set()
        files = []
        after = p.nodeAfterTree() if force else None
        while (p and p != after) {
            data = (p.gnx, g.fullPath(c, p))
            /* skip clones referring to exactly the same paths. */
            if (data in scanned_tnodes) {
                p.moveToNodeAfterTree()
                continue
            }
            scanned_tnodes.add(data)
            if (not p.h.startswith('@')) {
                p.moveToThreadNext()
            }
            else {
                if (p.isAtIgnoreNode()) {
                    if (p.isAnyAtFileNode()) {
                        c.ignored_at_file_nodes.append(p.h)
                    }
                    p.moveToNodeAfterTree()
                }
            }
            elif (
                p.isAtThinFileNode() or
                p.isAtAutoNode() or
                p.isAtEditNode() or
                p.isAtShadowFileNode() or
                p.isAtFileNode() or
                p.isAtCleanNode()  /* 1134. */
            ):
                files.append(p.copy())
                p.moveToNodeAfterTree()
            else {
                if (p.isAtAsisFileNode() or p.isAtNoSentFileNode()) {
                    /* Note (see #1081): @asis and @nosent can *not* be updated automatically. */
                    /* Doing so using refresh-from-disk will delete all child nodes. */
                    p.moveToNodeAfterTree()
                }
            }
            else {
                p.moveToThreadNext()
            }
        }
        return files
    }
    //@+node:ekr.20211016085907.26: *6* at.readFileAtPosition (elif BUG)
    public readFileAtPosition(force, p: Position): void {
        /* Read the @<file> node at p. */
        at, c, fileName = self, self.c, p.anyAtFileNodeName()
        ///
        if (p.isAtThinFileNode() or p.isAtFileNode()) {
            at.read(p)
        }
        elif p.isAtAutoNode():
            at.readOneAtAutoNode(p)
        elif p.isAtEditNode():
            at.readOneAtEditNode(fileName, p)
        elif p.isAtShadowFileNode():
            at.readOneAtShadowNode(fileName, p)
        elif p.isAtAsisFileNode() or p.isAtNoSentFileNode():
            at.rememberReadPath(g.fullPath(c, p), p)
        elif p.isAtCleanNode():
            at.readOneAtCleanNode(p)
    }
    //@+node:ekr.20211016085907.27: *5* at.readAtShadowNodes
    public readAtShadowNodes(p: Position): void {
        /* Read all @shadow nodes in the p's tree. */
        at = this
        after = p.nodeAfterTree()
        p = p.copy()  /* Don't change p in the caller. */
        while (p and p != after) { // # Don't use iterator.
            if (p.isAtShadowFileNode()) {
                fileName = p.atShadowFileNodeName()
                at.readOneAtShadowNode(fileName, p)
                p.moveToNodeAfterTree()
            }
            else {
                p.moveToThreadNext()
            }
        }
    }
    //@+node:ekr.20211016085907.28: *5* at.readOneAtAutoNode
    public readOneAtAutoNode(p: Position): void {
        /* Read an @auto file into p. Return the *new* position. */
        at, c, ic = this, this.c, this.c.importCommands
        fileName = g.fullPath(c, p)  /* #1521, #1341, #1914. */
        if (not g.os_path_exists(fileName)) {
            g.error(f"not found: {p.h!r}", nodeLink=p.get_UNL(with_proto=True))
            return p
        }
        /* Remember that we have seen the @auto node. */
        /* Fix bug 889175: Remember the full fileName. */
        at.rememberReadPath(fileName, p)
        /* if not g.unitTesting: g.es("reading:", p.h) */
        try {
            /* For #451: return p. */
            old_p = p.copy()
            at.scanAllDirectives(p)
            p.v.b = ''  /* Required for @auto API checks. */
            p.v._deleteAllChildren()
            p = ic.createOutline(parent=p.copy())
            /* Do *not* select a postion here. */
            /* That would improperly expand nodes. */
                /* c.selectPosition(p) */
        }
        except (Exception) {
            p = old_p
            ic.errors += 1
            g.es_print('Unexpected exception importing', fileName)
            g.es_exception()
        }
        if (ic.errors) {
            g.error(f"errors inhibited read @auto {fileName}")
        }
        else {
            if (c.persistenceController) {
                c.persistenceController.update_after_read_foreign_file(p)
            }
        }
        /* Finish. */
        if (ic.errors or not g.os_path_exists(fileName)) {
            p.clearDirty()
        }
        else {
            g.doHook('after-auto', c=c, p=p)
        }
        return p
    }
    //@+node:ekr.20211016085907.29: *5* at.readOneAtEditNode
    public readOneAtEditNode(fn, p: Position): void {
        at = this
        c = at.c
        ic = c.importCommands
        /* #1521 */
        fn = g.fullPath(c, p)
        junk, ext = g.os_path_splitext(fn)
        /* Fix bug 889175: Remember the full fileName. */
        at.rememberReadPath(fn, p)
        /* if not g.unitTesting: g.es("reading: @edit %s" % (g.shortFileName(fn))) */
        s, e = g.readFileIntoString(fn, kind='@edit')
        if (s is None) {
            return
        }
        encoding = 'utf-8' if e is None else e
        /* Delete all children. */
        while (p.hasChildren()) {
            p.firstChild().doDelete()
        }
        head = ''
        ext = ext.lower()
        if (ext in ('.html', '.htm')) {
            head = '@language html\n'
        }
        else {
            if (ext in ('.txt', '.text')) {
                head = '@nocolor\n'
            }
        }
        else {
            language = ic.languageForExtension(ext)
            if (language and language != 'unknown_language') {
                head = f"@language {language}\n"
            }
            else {
                head = '@nocolor\n'
            }
        }
        p.b = head + g.toUnicode(s, encoding=encoding, reportErrors=True)
        g.doHook('after-edit', p=p)
    }
    //@+node:ekr.20211016085907.30: *5* at.readOneAtAsisNode
    public readOneAtAsisNode(fn, p: Position): void {
        /* Read one @asis node. Used only by refresh-from-disk */
        at, c = this, this.c
        /* #1521 & #1341. */
        fn = g.fullPath(c, p)
        junk, ext = g.os_path_splitext(fn)
        /* Remember the full fileName. */
        at.rememberReadPath(fn, p)
        /* if not g.unitTesting: g.es("reading: @asis %s" % (g.shortFileName(fn))) */
        s, e = g.readFileIntoString(fn, kind='@edit')
        if (s is None) {
            return
        }
        encoding = 'utf-8' if e is None else e
        /* Delete all children. */
        while (p.hasChildren()) {
            p.firstChild().doDelete()
        }
        old_body = p.b
        p.b = g.toUnicode(s, encoding=encoding, reportErrors=True)
        if (not c.isChanged() and p.b != old_body) {
            c.setChanged()
        }
    }
    //@+node:ekr.20211016085907.31: *5* at.readOneAtCleanNode & helpers
    public readOneAtCleanNode(root): void {
        /* Update the @clean/@nosent node at root. */
        at, c, x = this, this.c, this.c.shadowController
        fileName = g.fullPath(c, root)
        if (not g.os_path_exists(fileName)) {
            g.es_print(
                f"not found: {fileName}",
                color='red',
                nodeLink=root.get_UNL(with_proto=True))
            return False
        }
        at.rememberReadPath(fileName, root)
        at.initReadIvars(root, fileName)
            /* Must be called before at.scanAllDirectives. */
        at.scanAllDirectives(root)
            /* Sets at.startSentinelComment/endSentinelComment. */
        new_public_lines = at.read_at_clean_lines(fileName)
        old_private_lines = this.write_at_clean_sentinels(root)
        marker = x.markerFromFileLines(old_private_lines, fileName)
        old_public_lines, junk = x.separate_sentinels(old_private_lines, marker)
        if (old_public_lines) {
            new_private_lines = x.propagate_changed_lines(
                new_public_lines, old_private_lines, marker, p=root)
        }
        else {
            new_private_lines = []
            root.b = ''.join(new_public_lines)
            return True
        }
        if (new_private_lines == old_private_lines) {
            return True
        }
        if (not g.unitTesting) {
            g.es("updating:", root.h)
        }
        root.clearVisitedInTree()
        gnx2vnode = at.fileCommands.gnxDict
        contents = ''.join(new_private_lines)
        FastAtRead(c, gnx2vnode).read_into_root(contents, fileName, root)
        return True  /* Errors not detected. */
    }
    //@+node:ekr.20211016085907.32: *6* at.dump_lines
    public dump(lines, tag): void {
        /* Dump all lines. */
        print(f"***** {tag} lines...\n")
        for (s in lines) {
            print(s.rstrip())
        }
    }
    //@+node:ekr.20211016085907.33: *6* at.read_at_clean_lines
    public read_at_clean_lines(fn): void {
        /* Return all lines of the @clean/@nosent file at fn. */
        at = this
        s = at.openFileHelper(fn)
            /* Use the standard helper. Better error reporting. */
            /* Important: uses 'rb' to open the file. */
        /* #1798. */
        if (s is None) {
            s = ''
        }
        else {
            s = g.toUnicode(s, encoding=at.encoding)
            s = s.replace('\r\n', '\n')
                /* Suppress meaningless "node changed" messages. */
        }
        return g.splitLines(s)
    }
    //@+node:ekr.20211016085907.34: *6* at.write_at_clean_sentinels
    public write_at_clean_sentinels(root): void {
        /** 
         * Return all lines of the @clean tree as if it were
         * written as an @file node.
         */
        at = this.c.atFileCommands
        result = at.atFileToString(root, sentinels=True)
        s = g.toUnicode(result, encoding=at.encoding)
        return g.splitLines(s)
    }
    //@+node:ekr.20211016085907.35: *5* at.readOneAtShadowNode & helper
    public readOneAtShadowNode(fn, p: Position): void {

        at, c = this, this.c
        x = c.shadowController
        if (not fn == p.atShadowFileNodeName()) {
            at.error(
                f"can not happen: fn: {fn} != atShadowNodeName: "
                f"{p.atShadowFileNodeName()}")
            return
        }
        fn = g.fullPath(c, p)  /* #1521 & #1341. */
        /* #889175: Remember the full fileName. */
        at.rememberReadPath(fn, p)
        shadow_fn = x.shadowPathName(fn)
        shadow_exists = g.os_path_exists(shadow_fn) and g.os_path_isfile(shadow_fn)
        /* Delete all children. */
        while (p.hasChildren()) {
            p.firstChild().doDelete()
        }
        if (shadow_exists) {
            at.read(p)
        }
        else {
            ok = at.importAtShadowNode(p)
            if (ok) {
                /* Create the private file automatically. */
                at.writeOneAtShadowNode(p)
            }
        }
    }
    //@+node:ekr.20211016085907.36: *6* at.importAtShadowNode
    public importAtShadowNode(p: Position): void {
        c, ic = this.c, this.c.importCommands
        fn = g.fullPath(c, p)  /* #1521, #1341, #1914. */
        if (not g.os_path_exists(fn)) {
            g.error(f"not found: {p.h!r}", nodeLink=p.get_UNL(with_proto=True))
            return p
        }
        /* Delete all the child nodes. */
        while (p.hasChildren()) {
            p.firstChild().doDelete()
        }
        /* Import the outline, exactly as @auto does. */
        ic.createOutline(parent=p.copy())
        if (ic.errors) {
            g.error('errors inhibited read @shadow', fn)
        }
        if (ic.errors or not g.os_path_exists(fn)) {
            p.clearDirty()
        }
        return ic.errors == 0
    }
    //@+node:ekr.20211016085907.37: *4* at.fast_read_into_root
    public fast_read_into_root(c: Commands, contents, gnx2vnode, path, root): void {
        /* A convenience wrapper for FastAtRead.read_into_root() */
        return FastAtRead(c, gnx2vnode).read_into_root(contents, path, root)
    }
    //@+node:ekr.20211016085907.38: *4* at.Reading utils...
    //@+node:ekr.20211016085907.39: *5* at.createImportedNode
    public createImportedNode(root, headline): void {
        at = this
        if (at.importRootSeen) {
            p = root.insertAsLastChild()
            p.initHeadString(headline)
        }
        else {
            /* Put the text into the already-existing root node. */
            p = root
            at.importRootSeen = True
        }
        p.v.setVisited()  /* Suppress warning about unvisited node. */
        return p
    }
    //@+node:ekr.20211016085907.40: *5* at.initReadLine
    public initReadLine(s: string): void {
        /* Init the ivars so that at.readLine will read all of s. */
        at = this
        at.read_i = 0
        at.read_lines = g.splitLines(s)
        at._file_bytes = g.toEncodedString(s)
    }
    //@+node:ekr.20211016085907.41: *5* at.parseLeoSentinel
    public parseLeoSentinel(s: string): void {
        /** 
         * Parse the sentinel line s.
         * If the sentinel is valid, set at.encoding, at.readVersion, at.readVersion5.
         */
        at, c = this, this.c
        /* Set defaults. */
        encoding = c.config.default_derived_file_encoding
        readVersion, readVersion5 = None, None
        new_df, start, end, isThin = False, '', '', False
        /* Example: \*@+leo-ver=5-thin-encoding=utf-8,.*/ */
        pattern = re.compile(
            r'(.+)@\+leo(-ver=([0123456789]+))?(-thin)?(-encoding=(.*)(\.))?(.*)')
            /* The old code weirdly allowed '.' in version numbers. */
            /* group 1: opening delim */
            /* group 2: -ver= */
            /* group 3: version number */
            /* group(4): -thin */
            /* group(5): -encoding=utf-8,. */
            /* group(6): utf-8, */
            /* group(7): . */
            /* group(8): closing delim. */
        m = pattern.match(s)
        valid = bool(m)
        if (valid) {
            start = m.group(1)  /* start delim */
            valid = bool(start)
        }
        if (valid) {
            new_df = bool(m.group(2))  /* -ver= */
            if (new_df) {
                /* Set the version number. */
                if (m.group(3)) {
                    readVersion = m.group(3)
                    readVersion5 = readVersion >= '5'
                }
                else {
                    valid = False
                }
            }
        }
        if (valid) {
            /* set isThin */
            isThin = bool(m.group(4))
        }
        if (valid and m.group(5)) {
            /* set encoding. */
            encoding = m.group(6)
            if (encoding and encoding.endswith(',')) {
                /* Leo 4.2 or after. */
                encoding = encoding[:-1]
            }
            if (not g.isValidEncoding(encoding)) {
                g.es_print("bad encoding in derived file:", encoding)
                valid = False
            }
        }
        if (valid) {
            end = m.group(8)  /* closing delim */
        }
        if (valid) {
            at.encoding = encoding
            at.readVersion = readVersion
            at.readVersion5 = readVersion5
        }
        return valid, new_df, start, end, isThin
    }
    //@+node:ekr.20211016085907.42: *5* at.readFileToUnicode & helpers
    public readFileToUnicode(fileName): void {
        /** 
         * Carefully sets at.encoding, then uses at.encoding to convert the file
         * to a unicode string.
         *
         * Sets at.encoding as follows:
         * 1. Use the BOM, if present. This unambiguously determines the encoding.
         * 2. Use the -encoding= field in the @+leo header, if present and valid.
         * 3. Otherwise, uses existing value of at.encoding, which comes from:
         * A. An @encoding directive, found by at.scanAllDirectives.
         * B. The value of c.config.default_derived_file_encoding.
         *
         * Returns the string, or None on failure.
         */
        at = this
        s = at.openFileHelper(fileName)
            /* Catches all exceptions. */
        /* #1798. */
        if (s is None) {
            return None
        }
        e, s = g.stripBOM(s)
        if (e) {
            /* The BOM determines the encoding unambiguously. */
            s = g.toUnicode(s, encoding=e)
        }
        else {
            /* Get the encoding from the header, or the default encoding. */
            s_temp = g.toUnicode(s, 'ascii', reportErrors=False)
            e = at.getEncodingFromHeader(fileName, s_temp)
            s = g.toUnicode(s, encoding=e)
        }
        s = s.replace('\r\n', '\n')
        at.encoding = e
        at.initReadLine(s)
        return s
    }
    //@+node:ekr.20211016085907.43: *6* at.openFileHelper
    public openFileHelper(fileName): void {
        /* Open a file, reporting all exceptions. */
        at = this
        /* #1798: return None as a flag on any error. */
        s = None
        try {
            with (open(fileName, 'rb') as f) {
                s = f.read()
            }
        }
        except (IOError) {
            at.error(f"can not open {fileName}")
        }
        except (Exception) {
            at.error(f"Exception reading {fileName}")
            g.es_exception()
        }
        return s
    }
    //@+node:ekr.20211016085907.44: *6* at.getEncodingFromHeader
    public getEncodingFromHeader(fileName, s: string): void {
        /** 
         * Return the encoding given in the @+leo sentinel, if the sentinel is
         * present, or the previous value of at.encoding otherwise.
         */
        at = this
        if (at.errors) {
            g.trace('can not happen: at.errors > 0', g.callers())
            e = at.encoding
            if (g.unitTesting) {
                assert False, g.callers()
            }
        }
        else {
            at.initReadLine(s)
            old_encoding = at.encoding
            assert old_encoding
            at.encoding = None
            /* Execute scanHeader merely to set at.encoding. */
            at.scanHeader(fileName, giveErrors=False)
            e = at.encoding or old_encoding
        }
        assert e
        return e
    }
    //@+node:ekr.20211016085907.45: *5* at.readLine
    public readLine(): void {
        /** 
         * Read one line from file using the present encoding.
         * Returns at.read_lines[at.read_i++]
         */
        /* This is an old interface, now used only by at.scanHeader. */
        /* For now, it's not worth replacing. */
        at = this
        if (at.read_i < len(at.read_lines)) {
            s = at.read_lines[at.read_i]
            at.read_i += 1
            return s
        }
        return ''  /* Not an error. */
    }
    //@+node:ekr.20211016085907.46: *5* at.scanHeader
    public scanHeader(fileName, giveErrors=True): void {
        /** 
         * Scan the @+leo sentinel, using the old readLine interface.
         *
         * Sets this.encoding, and this.start/endSentinelComment.
         *
         * Returns (firstLines,new_df,isThinDerivedFile) where:
         * firstLines        contains all @first lines,
         * new_df            is True if we are reading a new-format derived file.
         * isThinDerivedFile is True if the file is an @thin file.
         */
        at = this
        new_df, isThinDerivedFile = False, False
        firstLines: List[str] = []  /* The lines before @+leo. */
        s = this.scanFirstLines(firstLines)
        valid = len(s) > 0
        if (valid) {
            valid, new_df, start, end, isThinDerivedFile = at.parseLeoSentinel(s)
        }
        if (valid) {
            at.startSentinelComment = start
            at.endSentinelComment = end
        }
        else {
            if (giveErrors) {
                at.error(f"No @+leo sentinel in: {fileName}")
                g.trace(g.callers())
            }
        }
        return firstLines, new_df, isThinDerivedFile
    }
    //@+node:ekr.20211016085907.47: *6* at.scanFirstLines
    public scanFirstLines(firstLines): void {
        /** 
         * Append all lines before the @+leo line to firstLines.
         *
         * Empty lines are ignored because empty @first directives are
         * ignored.
         *
         * We can not call sentinelKind here because that depends on the comment
         * delimiters we set here.
         */
        at = this
        s = at.readLine()
        while (s and s.find("@+leo") == -1) {
            firstLines.append(s)
            s = at.readLine()
        }
        return s
    }
    //@+node:ekr.20211016085907.48: *5* at.scanHeaderForThin (import code)
    public scanHeaderForThin(fileName): void {
        /** 
         * Return true if the derived file is a thin file.
         *
         * This is a kludgy method used only by the import code.
         */
        at = this
        at.readFileToUnicode(fileName)
            /* Sets at.encoding, regularizes whitespace and calls at.initReadLines. */
        junk, junk, isThin = at.scanHeader(None)
            /* scanHeader uses at.readline instead of its args. */
            /* scanHeader also sets at.encoding. */
        return isThin
    }
    //@+node:ekr.20211016085907.49: *3* at.Writing
    //@+node:ekr.20211016085907.50: *4* Writing (top level)
    //@+node:ekr.20211016085907.51: *5* at.commands
    //@+node:ekr.20211016085907.52: *6* at.writeAtAutoNodes & writeDirtyAtAutoNodes & helpers
    @cmd('write-at-auto-nodes')
    public writeAtAutoNodes(event=None): void {
        /* Write all @auto nodes in the selected outline. */
        at, c = this, this.c
        c.init_error_dialogs()
        at.writeAtAutoNodesHelper(writeDirtyOnly=False)
        c.raise_error_dialogs(kind='write')
    }

    @cmd('write-dirty-at-auto-nodes')
    public writeDirtyAtAutoNodes(event=None): void {
        /* Write all dirty @auto nodes in the selected outline. */
        at, c = this, this.c
        c.init_error_dialogs()
        at.writeAtAutoNodesHelper(writeDirtyOnly=True)
        c.raise_error_dialogs(kind='write')
    }
    //@+node:ekr.20211016085907.53: *7* at.writeAtAutoNodesHelper
    public writeAtAutoNodesHelper(writeDirtyOnly=True): void {
        /* Write @auto nodes in the selected outline */
        at, c = this, this.c
        p = c.p
        after = p.nodeAfterTree()
        found = False
        while (p and p != after) {
            if (
                p.isAtAutoNode() and not p.isAtIgnoreNode() and
                (p.isDirty() or not writeDirtyOnly)
            ):
                ok = at.writeOneAtAutoNode(p)
                if (ok) {
                    found = True
                    p.moveToNodeAfterTree()
                }
                else {
                    p.moveToThreadNext()
                }
            else {
                p.moveToThreadNext()
            }
        }
        if (not g.unitTesting) {
            if (found) {
                g.es("finished")
            }
            else {
                if (writeDirtyOnly) {
                    g.es("no dirty @auto nodes in the selected tree")
                }
            }
            else {
                g.es("no @auto nodes in the selected tree")
            }
        }
    }
    //@+node:ekr.20211016085907.54: *6* at.writeAtShadowNodes & writeDirtyAtShadowNodes & helpers
    @cmd('write-at-shadow-nodes')
    public writeAtShadowNodes(event=None): void {
        /* Write all @shadow nodes in the selected outline. */
        at, c = this, this.c
        c.init_error_dialogs()
        val = at.writeAtShadowNodesHelper(writeDirtyOnly=False)
        c.raise_error_dialogs(kind='write')
        return val
    }

    @cmd('write-dirty-at-shadow-nodes')
    public writeDirtyAtShadowNodes(event=None): void {
        /* Write all dirty @shadow nodes in the selected outline. */
        at, c = this, this.c
        c.init_error_dialogs()
        val = at.writeAtShadowNodesHelper(writeDirtyOnly=True)
        c.raise_error_dialogs(kind='write')
        return val
    }
    //@+node:ekr.20211016085907.55: *7* at.writeAtShadowNodesHelper
    public writeAtShadowNodesHelper(writeDirtyOnly=True): void {
        /* Write @shadow nodes in the selected outline */
        at, c = this, this.c
        p = c.p
        after = p.nodeAfterTree()
        found = False
        while (p and p != after) {
            if (
                p.atShadowFileNodeName() and not p.isAtIgnoreNode()
                and (p.isDirty() or not writeDirtyOnly)
            ):
                ok = at.writeOneAtShadowNode(p)
                if (ok) {
                    found = True
                    g.blue(f"wrote {p.atShadowFileNodeName()}")
                    p.moveToNodeAfterTree()
                }
                else {
                    p.moveToThreadNext()
                }
            else {
                p.moveToThreadNext()
            }
        }
        if (not g.unitTesting) {
            if (found) {
                g.es("finished")
            }
            else {
                if (writeDirtyOnly) {
                    g.es("no dirty @shadow nodes in the selected tree")
                }
            }
            else {
                g.es("no @shadow nodes in the selected tree")
            }
        }
        return found
    }
    //@+node:ekr.20211016085907.56: *5* at.putFile & helper
    public putFile(root, fromString='', sentinels=True): void {
        /* Write the contents of the file to the output stream. */
        at = this
        s = fromString if fromString else root.v.b
        root.clearAllVisitedInTree()
        at.putAtFirstLines(s)
        at.putOpenLeoSentinel("@+leo-ver=5")
        at.putInitialComment()
        at.putOpenNodeSentinel(root)
        at.putBody(root, fromString=fromString)
        at.putCloseNodeSentinel(root)
        /* The -leo sentinel is required to handle @last. */
        at.putSentinel("@-leo")
        root.setVisited()
        at.putAtLastLines(s)
    }
    //@+node:ekr.20211016085907.57: *5* at.writeAll & helpers
    public writeAll(all=False, dirty=False): void {
        /* Write @file nodes in all or part of the outline */
        at, c = this, this.c
        /* This is the *only* place where these are set. */
        /* promptForDangerousWrite sets cancelFlag only if canCancelFlag is True. */
        at.unchangedFiles = 0
        at.canCancelFlag = True
        at.cancelFlag = False
        at.yesToAll = False
        files, root = at.findFilesToWrite(all)
        for (p in files) {
            try {
                at.writeAllHelper(p, root)
            }
            except (Exception) {
                at.internalWriteError(p)
            }
        }
        /* Make *sure* these flags are cleared for other commands. */
        at.canCancelFlag = False
        at.cancelFlag = False
        at.yesToAll = False
        /* Say the command is finished. */
        at.reportEndOfWrite(files, all, dirty)
        if (c.isChanged()) {
            /* Save the outline if only persistence data nodes are dirty. */
            at.saveOutlineIfPossible()
        }
    }
    //@+node:ekr.20211016085907.58: *6* at.findFilesToWrite
    public findFilesToWrite(force): void {
        /** 
         * Return a list of files to write.
         * We must do this in a prepass, so as to avoid errors later.
         */
        trace = 'save' in g.app.debug and not g.unitTesting
        if (trace) {
            g.trace(f"writing *{'selected' if force else 'all'}* files")
        }
        c = this.c
        if (force) {
            /* The Write @<file> Nodes command. */
            /* Write all nodes in the selected tree. */
            root = c.p
            p = c.p
            after = p.nodeAfterTree()
        }
        else {
            /* Write dirty nodes in the entire outline. */
            root = c.rootPosition()
            p = c.rootPosition()
            after = None
        }
        seen = set()
        files = []
        while (p and p != after) {
            if (p.isAtIgnoreNode() and not p.isAtAsisFileNode()) {
                /* Honor @ignore in *body* text, but *not* in @asis nodes. */
                if (p.isAnyAtFileNode()) {
                    c.ignored_at_file_nodes.append(p.h)
                }
                p.moveToNodeAfterTree()
            }
            else {
                if (p.isAnyAtFileNode()) {
                    data = p.v, g.fullPath(c, p)
                    if (data in seen) {
                        if (trace and force) {
                            g.trace('Already seen', p.h)
                        }
                    }
                    else {
                        seen.add(data)
                        files.append(p.copy())
                    }
                    /* Don't scan nested trees??? */
                    p.moveToNodeAfterTree()
                }
            }
            else {
                p.moveToThreadNext()
            }
        }
        /* When scanning *all* nodes, we only actually write dirty nodes. */
        if (not force) {
            files = [z for z in files if z.isDirty()]
        }
        if (trace) {
            g.printObj([z.h for z in files], tag='Files to be saved')
        }
        return files, root
    }
    //@+node:ekr.20211016085907.59: *6* at.internalWriteError
    public internalWriteError(p: Position): void {
        /** 
         * Fix bug 1260415: https://bugs.launchpad.net/leo-editor/+bug/1260415
         * Give a more urgent, more specific, more helpful message.
         */
        g.es_exception()
        g.es(f"Internal error writing: {p.h}", color='red')
        g.es('Please report this error to:', color='blue')
        g.es('https://groups.google.com/forum/  /* !forum/leo-editor', color='blue') */
        g.es('Warning: changes to this file will be lost', color='red')
        g.es('unless you can save the file successfully.', color='red')
    }
    //@+node:ekr.20211016085907.60: *6* at.reportEndOfWrite
    public reportEndOfWrite(files, all, dirty): void {

        at = this
        if (g.unitTesting) {
            return
        }
        if (files) {
            n = at.unchangedFiles
            g.es(f"finished: {n} unchanged file{g.plural(n)}")
        }
        else {
            if (all) {
                g.warning("no @<file> nodes in the selected tree")
            }
        }
        else {
            if (dirty) {
                g.es("no dirty @<file> nodes in the selected tree")
            }
        }
    }
    //@+node:ekr.20211016085907.61: *6* at.saveOutlineIfPossible
    public saveOutlineIfPossible(): void {
        /* Save the outline if only persistence data nodes are dirty. */
        c = this.c
        changed_positions = [p for p in c.all_unique_positions() if p.v.isDirty()]
        at_persistence = (
            c.persistenceController and
            c.persistenceController.has_at_persistence_node()
        )
        if (at_persistence) {
            changed_positions = [p for p in changed_positions
                if not at_persistence.isAncestorOf(p)]
        }
        if (not changed_positions) {
            /* g.warning('auto-saving @persistence tree.') */
            c.clearChanged()  /* Clears all dirty bits. */
            c.redraw()
        }
    }
    //@+node:ekr.20211016085907.62: *6* at.writeAllHelper & helper
    public writeAllHelper(p: Position, root): void {
        /** 
         * Write one file for at.writeAll.
         *
         * Do *not* write @auto files unless p == root.
         *
         * This prevents the write-all command from needlessly updating
         * the @persistence data, thereby annoyingly changing the .leo file.
         */
        at = this
        at.root = root
        if (p.isAtIgnoreNode()) {
            /* Should have been handled in findFilesToWrite. */
            g.trace(f"Can not happen: {p.h} is an @ignore node")
            return
        }
        try {
            at.writePathChanged(p)
        }
        except (IOError) {
            return
        }
        table = (
            (p.isAtAsisFileNode, at.asisWrite),
            (p.isAtAutoNode, at.writeOneAtAutoNode),
            (p.isAtCleanNode, at.writeOneAtCleanNode),
            (p.isAtEditNode, at.writeOneAtEditNode),
            (p.isAtFileNode, at.writeOneAtFileNode),
            (p.isAtNoSentFileNode, at.writeOneAtNosentNode),
            (p.isAtShadowFileNode, at.writeOneAtShadowNode),
            (p.isAtThinFileNode, at.writeOneAtFileNode),
        )
        for (pred, func in table) {
            if (pred()) {
                func(p)  /* type:ignore */
                break
            }
        }
        else {
            g.trace(f"Can not happen: {p.h}")
            return
        }
        /*  */
        /* Clear the dirty bits in all descendant nodes. */
        /* The persistence data may still have to be written. */
        for (p2 in p.self_and_subtree(copy=False)) {
            p2.v.clearDirty()
        }
    }
    //@+node:ekr.20211016085907.63: *7* at.writePathChanged
    public writePathChanged(p: Position): void {
        /** 
         * raise IOError if p's path has changed *and* user forbids the write.
         */
        at, c = this, this.c
        /*  */
        /* Suppress this message during save-as and save-to commands. */
        if (c.ignoreChangedPaths) {
            return
        }
        oldPath = g.os_path_normcase(at.getPathUa(p))
        newPath = g.os_path_normcase(g.fullPath(c, p))
        try { // # #1367: samefile can throw an exception.
            changed = oldPath and not os.path.samefile(oldPath, newPath)
        }
        except (Exception) {
            changed = True
        }
        if (not changed) {
            return
        }
        ok = at.promptForDangerousWrite(
            fileName=None,
            message=(
                f"{g.tr('path changed for %s' % (p.h))}\n"
                f"{g.tr('write this file anyway?')}"
            ),
        )
        if (not ok) {
            raise IOError
        }
        at.setPathUa(p, newPath)  /* Remember that we have changed paths. */
    }
    //@+node:ekr.20211016085907.64: *5* at.writeAtAutoContents
    public writeAtAutoContents(fileName, root): void {
        /* Common helper for atAutoToString and writeOneAtAutoNode. */
        at, c = this, this.c
        /* Dispatch the proper writer. */
        junk, ext = g.os_path_splitext(fileName)
        writer = at.dispatch(ext, root)
        if (writer) {
            at.outputList = []
            writer(root)
            return '' if at.errors else ''.join(at.outputList)
        }
        if (root.isAtAutoRstNode()) {
            /* An escape hatch: fall back to the theRst writer */
            /* if there is no rst writer plugin. */
            at.outputFile = outputFile = io.StringIO()
            ok = c.rstCommands.writeAtAutoFile(root, fileName, outputFile)
            return outputFile.close() if ok else None
        }
        /* leo 5.6: allow undefined section references in all @auto files. */
        ivar = 'allow_undefined_refs'
        try {
            setattr(at, ivar, True)
            at.outputList = []
            at.putFile(root, sentinels=False)
            return '' if at.errors else ''.join(at.outputList)
        }
        except (Exception) {
            return None
        }
        finally {
            if (hasattr(at, ivar)) {
                delattr(at, ivar)
            }
        }
    }
    //@+node:ekr.20211016085907.65: *5* at.writeX...
    //@+node:ekr.20211016085907.66: *6* at.asisWrite & helper
    public asisWrite(root): void {
        at, c = this, this.c
        try {
            c.endEditing()
            c.init_error_dialogs()
            fileName = at.initWriteIvars(root)
            /* #1450. */
            if (not fileName or not at.precheck(fileName, root)) {
                at.addToOrphanList(root)
                return
            }
            at.outputList = []
            for (p in root.self_and_subtree(copy=False)) {
                at.writeAsisNode(p)
            }
            if (not at.errors) {
                contents = ''.join(at.outputList)
                at.replaceFile(contents, at.encoding, fileName, root)
            }
        }
        except (Exception) {
            at.writeException(fileName, root)
        }
    }

    silentWrite = asisWrite  /* Compatibility with old scripts. */
    //@+node:ekr.20211016085907.67: *7* at.writeAsisNode
    public writeAsisNode(p: Position): void {
        /* Write the p's node to an @asis file. */
        at = this

        public put(s: string): void {
            /* Append s to this.output_list. */
            /* #1480: Avoid calling at.os(). */
            s = g.toUnicode(s, at.encoding, reportErrors=True)
            at.outputList.append(s)
        }

        /* Write the headline only if it starts with '@@'. */

        s = p.h
        if (g.match(s, 0, "@@")) {
            s = s[2:]
            if (s) {
                put('\n')  /* Experimental. */
                put(s)
                put('\n')
            }
        }
        /* Write the body. */
        s = p.b
        if (s) {
            put(s)
        }
    }
    //@+node:ekr.20211016085907.68: *6* at.writeMissing & helper
    public writeMissing(p: Position): void {
        at, c = this, this.c
        writtenFiles = False
        c.init_error_dialogs()
        /* #1450. */
        at.initWriteIvars(root=p.copy())
        p = p.copy()
        after = p.nodeAfterTree()
        while (p and p != after) { // # Don't use iterator.
            if (
                p.isAtAsisFileNode() or (p.isAnyAtFileNode() and not p.isAtIgnoreNode())
            ):
                fileName = p.anyAtFileNodeName()
                if (fileName) {
                    fileName = g.fullPath(c, p)  /* #1914. */
                    if (at.precheck(fileName, p)) {
                        at.writeMissingNode(p)
                        writtenFiles = True
                    }
                    else {
                        at.addToOrphanList(p)
                    }
                }
                p.moveToNodeAfterTree()
            else {
                if (p.isAtIgnoreNode()) {
                    p.moveToNodeAfterTree()
                }
            }
            else {
                p.moveToThreadNext()
            }
        }
        if (not g.unitTesting) {
            if (writtenFiles > 0) {
                g.es("finished")
            }
            else {
                g.es("no @file node in the selected tree")
            }
        }
        c.raise_error_dialogs(kind='write')
    }
    //@+node:ekr.20211016085907.69: *7* at.writeMissingNode
    public writeMissingNode(p: Position): void {

        at = this
        table = (
            (p.isAtAsisFileNode, at.asisWrite),
            (p.isAtAutoNode, at.writeOneAtAutoNode),
            (p.isAtCleanNode, at.writeOneAtCleanNode),
            (p.isAtEditNode, at.writeOneAtEditNode),
            (p.isAtFileNode, at.writeOneAtFileNode),
            (p.isAtNoSentFileNode, at.writeOneAtNosentNode),
            (p.isAtShadowFileNode, at.writeOneAtShadowNode),
            (p.isAtThinFileNode, at.writeOneAtFileNode),
        )
        for (pred, func in table) {
            if (pred()) {
                func(p)  /* type:ignore */
                return
            }
        }
        g.trace(f"Can not happen unknown @<file> kind: {p.h}")
    }
    //@+node:ekr.20211016085907.70: *6* at.writeOneAtAutoNode & helpers
    public writeOneAtAutoNode(p: Position): void {
        /** 
         * Write p, an @auto node.
         * File indices *must* have already been assigned.
         * Return True if the node was written successfully.
         */
        at, c = this, this.c
        root = p.copy()
        try {
            c.endEditing()
            if (not p.atAutoNodeName()) {
                return False
            }
            fileName = at.initWriteIvars(root)
            at.sentinels = False
            /* #1450. */
            if (not fileName or not at.precheck(fileName, root)) {
                at.addToOrphanList(root)
                return False
            }
            if (c.persistenceController) {
                c.persistenceController.update_before_write_foreign_file(root)
            }
            contents = at.writeAtAutoContents(fileName, root)
            if (contents is None) {
                g.es("not written:", fileName)
                at.addToOrphanList(root)
                return False
            }
            at.replaceFile(contents, at.encoding, fileName, root,
                ignoreBlankLines=root.isAtAutoRstNode())
            return True
        }
        except (Exception) {
            at.writeException(fileName, root)
            return False
        }
    }
    //@+node:ekr.20211016085907.71: *7* at.dispatch & helpers
    public dispatch(ext, p: Position): void {
        /* Return the correct writer function for p, an @auto node. */
        at = this
        /* Match @auto type before matching extension. */
        return at.writer_for_at_auto(p) or at.writer_for_ext(ext)
    }
    //@+node:ekr.20211016085907.72: *8* at.writer_for_at_auto
    public writer_for_at_auto(root): void {
        /* A factory returning a writer function for the given kind of @auto directive. */
        at = this
        d = g.app.atAutoWritersDict
        for (key in d) {
            aClass = d.get(key)
            if (aClass and g.match_word(root.h, 0, key)) {

                public writer_for_at_auto_cb(root): void {
                    /* pylint: disable=cell-var-from-loop */
                    try {
                        writer = aClass(at.c)
                        s = writer.write(root)
                        return s
                    }
                    except (Exception) {
                        g.es_exception()
                        return None
                    }
                }

                return writer_for_at_auto_cb
            }
        }
        return None
    }
    //@+node:ekr.20211016085907.73: *8* at.writer_for_ext
    public writer_for_ext(ext): void {
        /* A factory returning a writer function for the given file extension. */
        at = this
        d = g.app.writersDispatchDict
        aClass = d.get(ext)
        if (aClass) {

            public writer_for_ext_cb(root): void {
                try {
                    return aClass(at.c).write(root)
                }
                except (Exception) {
                    g.es_exception()
                    return None
                }
            }

            return writer_for_ext_cb
        }

        return None
    }
    //@+node:ekr.20211016085907.74: *6* at.writeOneAtCleanNode
    public writeOneAtCleanNode(root): void {
        /** Write one @clean file..
         * root is the position of an @clean node.
         */
        at, c = this, this.c
        try {
            c.endEditing()
            fileName = at.initWriteIvars(root)
            at.sentinels = False
            if (not fileName or not at.precheck(fileName, root)) {
                return
            }
            at.outputList = []
            at.putFile(root, sentinels=False)
            at.warnAboutOrphandAndIgnoredNodes()
            if (at.errors) {
                g.es("not written:", g.shortFileName(fileName))
                at.addToOrphanList(root)
            }
            else {
                contents = ''.join(at.outputList)
                at.replaceFile(contents, at.encoding, fileName, root)
            }
        }
        except (Exception) {
            if (hasattr(this.root.v, 'tnodeList')) {
                delattr(this.root.v, 'tnodeList')
            }
            at.writeException(fileName, root)
        }
    }
    //@+node:ekr.20211016085907.75: *6* at.writeOneAtEditNode
    public writeOneAtEditNode(p: Position): void {
        /* Write one @edit node. */
        at, c = this, this.c
        root = p.copy()
        try {
            c.endEditing()
            c.init_error_dialogs()
            if (not p.atEditNodeName()) {
                return False
            }
            if (p.hasChildren()) {
                g.error('@edit nodes must not have children')
                g.es('To save your work, convert @edit to @auto, @file or @clean')
                return False
            }
            fileName = at.initWriteIvars(root)
            at.sentinels = False
            /* #1450. */
            if (not fileName or not at.precheck(fileName, root)) {
                at.addToOrphanList(root)
                return False
            }
            contents = ''.join([s for s in g.splitLines(p.b)
                if at.directiveKind4(s, 0) == at.noDirective])
            at.replaceFile(contents, at.encoding, fileName, root)
            c.raise_error_dialogs(kind='write')
            return True
        }
        except (Exception) {
            at.writeException(fileName, root)
            return False
        }
    }
    //@+node:ekr.20211016085907.76: *6* at.writeOneAtFileNode
    public writeOneAtFileNode(root): void {
        /* Write @file or @thin file. */
        at, c = this, this.c
        try {
            c.endEditing()
            fileName = at.initWriteIvars(root)
            at.sentinels = True
            if (not fileName or not at.precheck(fileName, root)) {
                /* Raise dialog warning of data loss. */
                at.addToOrphanList(root)
                return
            }
            at.outputList = []
            at.putFile(root, sentinels=True)
            at.warnAboutOrphandAndIgnoredNodes()
            if (at.errors) {
                g.es("not written:", g.shortFileName(fileName))
                at.addToOrphanList(root)
            }
            else {
                contents = ''.join(at.outputList)
                at.replaceFile(contents, at.encoding, fileName, root)
            }
        }
        except (Exception) {
            if (hasattr(this.root.v, 'tnodeList')) {
                delattr(this.root.v, 'tnodeList')
            }
            at.writeException(fileName, root)
        }
    }
    //@+node:ekr.20211016085907.77: *6* at.writeOneAtNosentNode
    public writeOneAtNosentNode(root): void {
        /** Write one @nosent node.
         * root is the position of an @<file> node.
         * sentinels will be False for @clean and @nosent nodes.
         */
        at, c = this, this.c
        try {
            c.endEditing()
            fileName = at.initWriteIvars(root)
            at.sentinels = False
            if (not fileName or not at.precheck(fileName, root)) {
                return
            }
            at.outputList = []
            at.putFile(root, sentinels=False)
            at.warnAboutOrphandAndIgnoredNodes()
            if (at.errors) {
                g.es("not written:", g.shortFileName(fileName))
                at.addToOrphanList(root)
            }
            else {
                contents = ''.join(at.outputList)
                at.replaceFile(contents, at.encoding, fileName, root)
            }
        }
        except (Exception) {
            if (hasattr(this.root.v, 'tnodeList')) {
                delattr(this.root.v, 'tnodeList')
            }
            at.writeException(fileName, root)
        }
    }
    //@+node:ekr.20211016085907.78: *6* at.writeOneAtShadowNode & helpers
    public writeOneAtShadowNode(p: Position, testing=False): void {
        /** 
         * Write p, an @shadow node.
         * File indices *must* have already been assigned.
         *
         * testing: set by unit tests to suppress the call to at.precheck.
         * Testing is not the same as g.unitTesting.
         */
        at, c = this, this.c
        root = p.copy()
        x = c.shadowController
        try {
            c.endEditing()  /* Capture the current headline. */
            fn = p.atShadowFileNodeName()
            assert fn, p.h
            this.adjustTargetLanguage(fn)
                /* A hack to support unknown extensions. May set c.target_language. */
            full_path = g.fullPath(c, p)
            at.initWriteIvars(root)
            /* Force python sentinels to suppress an error message. */
            /* The actual sentinels will be set below. */
            at.endSentinelComment = None
            at.startSentinelComment = "  /* " */
            /* Make sure we can compute the shadow directory. */
            private_fn = x.shadowPathName(full_path)
            if (not private_fn) {
                return False
            }
            if (not testing and not at.precheck(full_path, root)) {
                return False
            }
            /*  */
            /* Bug fix: Leo 4.5.1: */
            /* use x.markerFromFileName to force the delim to match */
            /* what is used in x.propegate changes. */
            marker = x.markerFromFileName(full_path)
            at.startSentinelComment, at.endSentinelComment = marker.getDelims()
            if (g.unitTesting) {
                ivars_dict = g.getIvarsDict(at)
            }
            /*  */
            /* Write the public and private files to strings. */

            public put(sentinels): void {
                at.outputList = []
                at.sentinels = sentinels
                at.putFile(root, sentinels=sentinels)
                return '' if at.errors else ''.join(at.outputList)
            }

            at.public_s = put(False)
            at.private_s = put(True)
            at.warnAboutOrphandAndIgnoredNodes()
            if (g.unitTesting) {
                exceptions = ('public_s', 'private_s', 'sentinels', 'outputList')
                assert g.checkUnchangedIvars(
                    at, ivars_dict, exceptions), 'writeOneAtShadowNode'
            }
            if (not at.errors) {
                /* Write the public and private files. */
                x.makeShadowDirectory(full_path)
                    /* makeShadowDirectory takes a *public* file name. */
                x.replaceFileWithString(at.encoding, private_fn, at.private_s)
                x.replaceFileWithString(at.encoding, full_path, at.public_s)
            }
            at.checkPythonCode(contents=at.private_s, fileName=full_path, root=root)
            if (at.errors) {
                g.error("not written:", full_path)
                at.addToOrphanList(root)
            }
            else {
                root.clearDirty()
            }
            return not at.errors
        }
        except (Exception) {
            at.writeException(full_path, root)
            return False
        }
    }
    //@+node:ekr.20211016085907.79: *7* at.adjustTargetLanguage
    public adjustTargetLanguage(fn): void {
        /** Use the language implied by fn's extension if
         * there is a conflict between it and c.target_language.
         */
        at = this
        c = at.c
        junk, ext = g.os_path_splitext(fn)
        if (ext) {
            if (ext.startswith('.')) {
                ext = ext[1:]
            }
            language = g.app.extension_dict.get(ext)
            if (language) {
                c.target_language = language
            }
            else {
                /* An unknown language. */
                /* Use the default language, **not** 'unknown_language' */
                pass
            }
        }
    }
    //@+node:ekr.20211016085907.80: *5* at.XToString
    //@+node:ekr.20211016085907.81: *6* at.atAsisToString
    public atAsisToString(root): void {
        /* Write the @asis node to a string. */
        at, c = this, this.c
        try {
            c.endEditing()
            fileName = at.initWriteIvars(root)
            at.outputList = []
            for (p in root.self_and_subtree(copy=False)) {
                at.writeAsisNode(p)
            }
            return '' if at.errors else ''.join(at.outputList)
        }
        except (Exception) {
            at.writeException(fileName, root)
            return ''
        }
    }
    //@+node:ekr.20211016085907.82: *6* at.atAutoToString
    public atAutoToString(root): void {
        /* Write the root @auto node to a string, and return it. */
        at, c = this, this.c
        try {
            c.endEditing()
            fileName = at.initWriteIvars(root)
            at.sentinels = False
            /* #1450. */
            if (not fileName) {
                at.addToOrphanList(root)
                return ''
            }
            return at.writeAtAutoContents(fileName, root) or ''
        }
        except (Exception) {
            at.writeException(fileName, root)
            return ''
        }
    }
    //@+node:ekr.20211016085907.83: *6* at.atEditToString
    public atEditToString(root): void {
        /* Write one @edit node. */
        at, c = this, this.c
        try {
            c.endEditing()
            if (root.hasChildren()) {
                g.error('@edit nodes must not have children')
                g.es('To save your work, convert @edit to @auto, @file or @clean')
                return False
            }
            fileName = at.initWriteIvars(root)
            at.sentinels = False
            /* #1450. */
            if (not fileName) {
                at.addToOrphanList(root)
                return ''
            }
            contents = ''.join([
                s for s in g.splitLines(root.b)
                    if at.directiveKind4(s, 0) == at.noDirective])
            return contents
        }
        except (Exception) {
            at.writeException(fileName, root)
            return ''
        }
    }
    //@+node:ekr.20211016085907.84: *6* at.atFileToString
    public atFileToString(root, sentinels=True): void {
        /* Write an external file to a string, and return its contents. */
        at, c = this, this.c
        try {
            c.endEditing()
            at.initWriteIvars(root)
            at.sentinels = sentinels
            at.outputList = []
            at.putFile(root, sentinels=sentinels)
            assert root == at.root, 'write'
            contents = '' if at.errors else ''.join(at.outputList)
            /* Major bug: failure to clear this wipes out headlines! */
            /* Sometimes this causes slight problems... */
            if (hasattr(this.root.v, 'tnodeList')) {
                delattr(this.root.v, 'tnodeList')
                root.v._p_changed = True
            }
            return contents
        }
        except (Exception) {
            if (hasattr(this.root.v, 'tnodeList')) {
                delattr(this.root.v, 'tnodeList')
            }
            at.exception("exception preprocessing script")
            root.v._p_changed = True
            return ''
        }
    }
    //@+node:ekr.20211016085907.85: *6* at.stringToString
    public stringToString(root, s: string, forcePythonSentinels=True, sentinels=True): void {
        /** 
         * Write an external file from a string.
         *
         * This is at.write specialized for scripting.
         */
        at, c = this, this.c
        try {
            c.endEditing()
            at.initWriteIvars(root)
            if (forcePythonSentinels) {
                at.endSentinelComment = None
                at.startSentinelComment = "  /* " */
                at.language = "python"
            }
            at.sentinels = sentinels
            at.outputList = []
            at.putFile(root, fromString=s, sentinels=sentinels)
            contents = '' if at.errors else ''.join(at.outputList)
            /* Major bug: failure to clear this wipes out headlines! */
            /* Sometimes this causes slight problems... */
            if (root) {
                if (hasattr(this.root.v, 'tnodeList')) {
                    delattr(this.root.v, 'tnodeList')
                }
                root.v._p_changed = True
            }
            return contents
        }
        except (Exception) {
            at.exception("exception preprocessing script")
            return ''
        }
    }
    //@+node:ekr.20211016085907.86: *4* Writing helpers
    //@+node:ekr.20211016085907.87: *5* at.putBody & helper
    public putBody(p: Position, fromString=''): void {
        /** 
         * Generate the body enclosed in sentinel lines.
         * Return True if the body contains an @others line.
         */
        at = this
        /*  */
        /* New in 4.3 b2: get s from fromString if possible. */
        s = fromString if fromString else p.b
        p.v.setVisited()
            /* Make sure v is never expanded again. */
            /* Suppress orphans check. */
        /*  */
        /* Fix #1048 & #1037: regularize most trailing whitespace. */
        if (s and (at.sentinels or at.force_newlines_in_at_nosent_bodies)) {
            if (not s.endswith('\n')) {
                s = s + '\n'
            }
        }
        at.raw = False  /* Bug fix. */
        i = 0
        status = g.Bunch(
            at_comment_seen=False,
            at_delims_seen=False,
            at_warning_given=False,
            has_at_others=False,
            in_code=True,
        )
        while (i < len(s)) {
            next_i = g.skip_line(s, i)
            assert next_i > i, 'putBody'
            kind = at.directiveKind4(s, i)
            at.putLine(i, kind, p, s, status)
            i = next_i
        }
        /* pylint: disable=no-member */
            /* g.bunch *does* have .in_code and has_at_others members. */
        if (not status.in_code) {
            at.putEndDocLine()
        }
        return status.has_at_others
    }
    //@+node:ekr.20211016085907.88: *6* at.putLine
    public putLine(i: number, kind, p: Position, s: string, status): void {
        /* Put the line at s[i:] of the given kind, updating the status. */
        at = this
        if (kind == at.noDirective) {
            if (status.in_code) {
                if (at.raw) {
                    at.putCodeLine(s, i)
                }
                else {
                    name, n1, n2 = at.findSectionName(s, i)
                    if (name) {
                        at.putRefLine(s, i, n1, n2, name, p)
                    }
                    else {
                        at.putCodeLine(s, i)
                    }
                }
            }
            else {
                at.putDocLine(s, i)
            }
        }
        else {
            if (at.raw) {
                if (kind == at.endRawDirective) {
                    at.raw = False
                    at.putSentinel("@@end_raw")
                }
                else {
                    /* Fix bug 784920: @raw mode does not ignore directives */
                    at.putCodeLine(s, i)
                }
            }
        }
        else {
            if (kind in (at.docDirective, at.atDirective)) {
                if (not status.in_code) {
                    /* Bug fix 12/31/04: handle adjacent doc parts. */
                    at.putEndDocLine()
                }
                at.putStartDocLine(s, i, kind)
                status.in_code = False
            }
        }
        else {
            if (kind in (at.cDirective, at.codeDirective)) {
                /* Only @c and @code end a doc part. */
                if (not status.in_code) {
                    at.putEndDocLine()
                }
                at.putDirective(s, i, p)
                status.in_code = True
            }
        }
        else {
            if (kind == at.allDirective) {
                if (status.in_code) {
                    if (p == this.root) {
                        at.putAtAllLine(s, i, p)
                    }
                    else {
                        at.error(f"@all not valid in: {p.h}")
                    }
                }
                else { // at.putDocLine(s, i)
                }
            }
        }
        else {
            if (kind == at.othersDirective) {
                if (status.in_code) {
                    if (status.has_at_others) {
                        at.error(f"multiple @others in: {p.h}")
                    }
                    else {
                        at.putAtOthersLine(s, i, p)
                        status.has_at_others = True
                    }
                }
                else {
                    at.putDocLine(s, i)
                }
            }
        }
        else {
            if (kind == at.rawDirective) {
                at.raw = True
                at.putSentinel("@@raw")
            }
        }
        else {
            if (kind == at.endRawDirective) {
                /* Fix bug 784920: @raw mode does not ignore directives */
                at.error(f"unmatched @end_raw directive: {p.h}")
            }
        }
        else {
            if (kind == at.startVerbatim) {
                /* Fix bug 778204: @verbatim not a valid Leo directive. */
                if (g.unitTesting) {
                    /* A hack: unit tests for @shadow use @verbatim as a kind of directive. */
                    pass
                }
                else {
                    at.error(f"@verbatim is not a Leo directive: {p.h}")
                }
            }
        }
        else {
            if (kind == at.miscDirective) {
                /* Fix bug 583878: Leo should warn about @comment/@delims clashes. */
                if (g.match_word(s, i, '@comment')) {
                    status.at_comment_seen = True
                }
                else {
                    if (g.match_word(s, i, '@delims')) {
                        status.at_delims_seen = True
                    }
                }
                if (
                    status.at_comment_seen and
                    status.at_delims_seen and not
                    status.at_warning_given
                ):
                    status.at_warning_given = True
                    at.error(f"@comment and @delims in node {p.h}")
                at.putDirective(s, i, p)
            }
        }
        else {
            at.error(f"putBody: can not happen: unknown directive kind: {kind}")
        }
    }
    //@+node:ekr.20211016085907.89: *5* writing code lines...
    //@+node:ekr.20211016085907.90: *6* at.all
    //@+node:ekr.20211016085907.91: *7* at.putAtAllLine
    public putAtAllLine(s: string, i: number, p: Position): void {
        /* Put the expansion of @all. */
        at = this
        j, delta = g.skip_leading_ws_with_indent(s, i, at.tab_width)
        k = g.skip_to_end_of_line(s, i)
        at.putLeadInSentinel(s, i, j, delta)
        at.indent += delta
        at.putSentinel("@+" + s[j + 1 : k].strip())
            /* s[j:k] starts with '@all' */
        for (child in p.children()) {
            at.putAtAllChild(child)
        }
        at.putSentinel("@-all")
        at.indent -= delta
    }
    //@+node:ekr.20211016085907.92: *7* at.putAtAllBody
    public putAtAllBody(p: Position): void {
        /* Generate the body enclosed in sentinel lines. */
        at = this
        s = p.b
        p.v.setVisited()
            /* Make sure v is never expanded again. */
            /* Suppress orphans check. */
        if (at.sentinels and s and s[-1] != '\n') {
            s = s + '\n'
        }
        i, inCode = 0, True
        while (i < len(s)) {
            next_i = g.skip_line(s, i)
            assert next_i > i
            if (inCode) {
                /* Use verbatim sentinels to write all directives. */
                at.putCodeLine(s, i)
            }
            else {
                at.putDocLine(s, i)
            }
            i = next_i
        }
        if (not inCode) {
            at.putEndDocLine()
        }
    }
    //@+node:ekr.20211016085907.93: *7* at.putAtAllChild
    public putAtAllChild(p: Position): void {
        /** 
         * This code puts only the first of two or more cloned siblings, preceding
         * the clone with an @clone n sentinel.
         *
         * This is a debatable choice: the cloned tree appears only once in the
         * external file. This should be benign; the text created by @all is
         * likely to be used only for recreating the outline in Leo. The
         * representation in the derived file doesn't matter much.
         */
        at = this
        at.putOpenNodeSentinel(p, inAtAll=True)
            /* Suppress warnings about @file nodes. */
        at.putAtAllBody(p)
        for (child in p.children()) {
            at.putAtAllChild(child)
        }
        at.putCloseNodeSentinel(p)
    }
    //@+node:ekr.20211016085907.94: *6* at.others (write)
    //@+node:ekr.20211016085907.95: *7* at.putAtOthersLine & helpers
    public putAtOthersLine(s: string, i: number, p: Position): void {
        /* Put the expansion of @others. */
        at = this
        j, delta = g.skip_leading_ws_with_indent(s, i, at.tab_width)
        k = g.skip_to_end_of_line(s, i)
        at.putLeadInSentinel(s, i, j, delta)
        at.indent += delta
        at.putSentinel("@+" + s[j + 1 : k].strip())
            /* s[j:k] starts with '@others' */
            /* Never write lws in new sentinels. */
        for (child in p.children()) {
            p = child.copy()
            after = p.nodeAfterTree()
            while (p and p != after) {
                if (at.validInAtOthers(p)) {
                    at.putOpenNodeSentinel(p)
                    at_others_flag = at.putBody(p)
                    at.putCloseNodeSentinel(p)
                    if (at_others_flag) {
                        p.moveToNodeAfterTree()
                    }
                    else {
                        p.moveToThreadNext()
                    }
                }
                else {
                    p.moveToNodeAfterTree()
                }
            }
        }
        /* This is the same in both old and new sentinels. */
        at.putSentinel("@-others")
        at.indent -= delta
    }
    //@+node:ekr.20211016085907.96: *8* at.putAtOthersChild
    public putAtOthersChild(p: Position): void {
        at = this
        at.putOpenNodeSentinel(p)
        at.putBody(p)
        at.putCloseNodeSentinel(p)
    }
    //@+node:ekr.20211016085907.97: *8* at.validInAtOthers (write)
    public validInAtOthers(p: Position): void {
        /** 
         * Return True if p should be included in the expansion of the @others
         * directive in the body text of p's parent.
         */
        at = this
        i = g.skip_ws(p.h, 0)
        isSection, junk = at.isSectionName(p.h, i)
        if (isSection) {
            return False  /* A section definition node. */
        }
        if (at.sentinels) {
            /* @ignore must not stop expansion here! */
            return True
        }
        if (p.isAtIgnoreNode()) {
            g.error('did not write @ignore node', p.v.h)
            return False
        }
        return True
    }
    //@+node:ekr.20211016085907.98: *6* at.putCodeLine
    public putCodeLine(s: string, i: number): void {
        /* Put a normal code line. */
        at = this
        /* Put @verbatim sentinel if required. */
        k = g.skip_ws(s, i)
        if (g.match(s, k, this.startSentinelComment + '@')) {
            this.putSentinel('@verbatim')
        }
        j = g.skip_line(s, i)
        line = s[i:j]
        /* Don't put any whitespace in otherwise blank lines. */
        if (len(line) > 1) { // # Preserve *anything* the user puts on the line!!!
            if (not at.raw) {
                at.putIndent(at.indent, line)
            }
            if (line[-1) { // ] == '\n':
                at.os(line[:-1])
                at.onl()
            }
            else {
                at.os(line)
            }
        }
        else {
            if (line and line[-1] == '\n') {
                at.onl()
            }
        }
        else {
            if (line) {
                at.os(line)  /* Bug fix: 2013/09/16 */
            }
        }
        else {
            g.trace('Can not happen: completely empty line')
        }
    }
    //@+node:ekr.20211016085907.99: *6* at.putRefLine & helpers
    public putRefLine(s: string, i: number, n1, n2, name, p: Position): void {
        /* Put a line containing one or more references. */
        at = this
        ref = at.findReference(name, p)
        is_clean = at.root.h.startswith('@clean')
        if (not ref) {
            if (hasattr(at, 'allow_undefined_refs')) {
                /* Allow apparent section reference: just write the line. */
                at.putCodeLine(s, i)
            }
            return
        }
        /* Compute delta only once. */
        junk, delta = g.skip_leading_ws_with_indent(s, i, at.tab_width)
        /* Write the lead-in sentinel only once. */
        at.putLeadInSentinel(s, i, n1, delta)
        this.putRefAt(name, ref, delta)
        n_refs = 0
        while (1) {
            progress = i
            i = n2
            n_refs += 1
            name, n1, n2 = at.findSectionName(s, i)
            if (is_clean and n_refs > 1) {
                /* #1232: allow only one section reference per line in @clean. */
                i1, i2 = g.getLine(s, i)
                line = s[i1:i2].rstrip()
                at.writeError(f"Too many section references:\n{line!s}")
                break
            }
            if (name) {
                ref = at.findReference(name, p)
                    /* Issues error if not found. */
                if (ref) {
                    middle_s = s[i:n1]
                    this.putAfterMiddleRef(middle_s, delta)
                    this.putRefAt(name, ref, delta)
                }
            }
            else {
                break
            }
            assert progress < i
        }
        this.putAfterLastRef(s, i, delta)
    }
    //@+node:ekr.20211016085907.100: *7* at.findReference
    public findReference(name, p: Position): void {
        /* Find a reference to name.  Raise an error if not found. */
        at = this
        ref = g.findReference(name, p)
        if (not ref and not hasattr(at, 'allow_undefined_refs')) {
            /* Do give this error even if unit testing. */
            at.writeError(
                f"undefined section: {g.truncate(name, 60)}\n"
                f"  referenced from: {g.truncate(p.h, 60)}")
        }
        return ref
    }
    //@+node:ekr.20211016085907.101: *7* at.findSectionName
    public findSectionName(s: string, i: number): void {
        /** 
         * Return n1, n2 representing a section name.
         * The section name, *including* brackes is s[n1:n2]
         */
        end = s.find('\n', i)
        if (end == -1) {
            n1 = s.find("<<", i)
            n2 = s.find(">>", i)
        }
        else {
            n1 = s.find("<<", i, end)
            n2 = s.find(">>", i, end)
        }
        ok = -1 < n1 < n2
        if (ok) {
            /* Warn on extra brackets. */
            for (ch, j in (('<', n1 + 2), ('>', n2 + 2))) {
                if (g.match(s, j, ch)) {
                    line = g.get_line(s, i)
                    g.es('dubious brackets in', line)
                    break
                }
            }
            name = s[n1 : n2 + 2]
            return name, n1, n2 + 2
        }
        return None, n1, len(s)
    }
    //@+node:ekr.20211016085907.102: *7* at.putAfterLastRef
    public putAfterLastRef(s: string, start, delta): void {
        /* Handle whatever follows the last ref of a line. */
        at = this
        j = g.skip_ws(s, start)
        if (j < len(s) and s[j] != '\n') {
            /* Temporarily readjust delta to make @afterref look better. */
            at.indent += delta
            at.putSentinel("@afterref")
            end = g.skip_line(s, start)
            after = s[start:end]
            at.os(after)
            if (at.sentinels and after and after[-1] != '\n') {
                at.onl()  /* Add a newline if the line didn't end with one. */
            }
            at.indent -= delta
        }
    }
    //@+node:ekr.20211016085907.103: *7* at.putAfterMiddleRef
    public putAfterMiddleRef(s: string, delta): void {
        /* Handle whatever follows a ref that is not the last ref of a line. */
        at = this
        if (s) {
            at.indent += delta
            at.putSentinel("@afterref")
            at.os(s)
            at.onl_sent()  /* Not a real newline. */
            at.indent -= delta
        }
    }
    //@+node:ekr.20211016085907.104: *7* at.putRefAt
    public putRefAt(name, ref, delta): void {
        at = this
        /* #132: Section Reference causes clone... */
        /*  */
        /* Never put any @+middle or @-middle sentinels. */
        at.indent += delta
        at.putSentinel("@+" + name)
        at.putOpenNodeSentinel(ref)
        at.putBody(ref)
        at.putCloseNodeSentinel(ref)
        at.putSentinel("@-" + name)
        at.indent -= delta
    }
    //@+node:ekr.20211016085907.105: *5* writing doc lines...
    //@+node:ekr.20211016085907.106: *6* at.putBlankDocLine
    public putBlankDocLine(): void {
        at = this
        if (not at.endSentinelComment) {
            at.putIndent(at.indent)
            at.os(at.startSentinelComment)
            /* #1496: Retire the @doc convention. */
            /* Remove the blank. */
            /* at.oblank() */
        }
        at.onl()
    }
    //@+node:ekr.20211016085907.107: *6* at.putDocLine
    public putDocLine(s: string, i: number): void {
        /* Handle one line of a doc part. */
        at = this
        j = g.skip_line(s, i)
        s = s[i:j]
        /*  */
        /* #1496: Retire the @doc convention: */
        /* Strip all trailing ws here. */
        if (not s.strip()) {
            /* A blank line. */
            at.putBlankDocLine()
            return
        }
        /* Write the line as it is. */
        at.putIndent(at.indent)
        if (not at.endSentinelComment) {
            at.os(at.startSentinelComment)
            /* #1496: Retire the @doc convention. */
            /* Leave this blank. The line is not blank. */
            at.oblank()
        }
        at.os(s)
        if (not s.endswith('\n')) {
            at.onl()
        }
    }
    //@+node:ekr.20211016085907.108: *6* at.putEndDocLine
    public putEndDocLine(): void {
        /* Write the conclusion of a doc part. */
        at = this
        /* Put the closing delimiter if we are using block comments. */
        if (at.endSentinelComment) {
            at.putIndent(at.indent)
            at.os(at.endSentinelComment)
            at.onl()  /* Note: no trailing whitespace. */
        }
    }
    //@+node:ekr.20211016085907.109: *6* at.putStartDocLine
    public putStartDocLine(s: string, i: number, kind): void {
        /* Write the start of a doc part. */
        at = this
        sentinel = "@+doc" if kind == at.docDirective else "@+at"
        directive = "@doc" if kind == at.docDirective else "@"
        /* Put whatever follows the directive in the sentinel. */
        /* Skip past the directive. */
        i += len(directive)
        j = g.skip_to_end_of_line(s, i)
        follow = s[i:j]
        /* Put the opening @+doc or @-doc sentinel, including whatever follows the directive. */
        at.putSentinel(sentinel + follow)
        /* Put the opening comment if we are using block comments. */
        if (at.endSentinelComment) {
            at.putIndent(at.indent)
            at.os(at.startSentinelComment)
            at.onl()
        }
    }
    //@+node:ekr.20211016085907.110: *4* Writing sentinels...
    //@+node:ekr.20211016085907.111: *5* at.nodeSentinelText & helper
    public nodeSentinelText(p: Position): void {
        /* Return the text of a @+node or @-node sentinel for p. */
        at = this
        h = at.removeCommentDelims(p)
        if (getattr(at, 'at_shadow_test_hack', False)) {
            /* A hack for @shadow unit testing. */
            /* see AtShadowTestCase.makePrivateLines. */
            return h
        }
        gnx = p.v.fileIndex
        level = 1 + p.level() - this.root.level()
        if (level > 2) {
            return f"{gnx}: *{level}* {h}"
        }
        return f"{gnx}: {'*' * level} {h}"
    }
    //@+node:ekr.20211016085907.112: *6* at.removeCommentDelims
    public removeCommentDelims(p: Position): void {
        /** 
         * If the present @language/@comment settings do not specify a single-line comment
         * we remove all block comment delims from h. This prevents headline text from
         * interfering with the parsing of node sentinels.
         */
        at = this
        start = at.startSentinelComment
        end = at.endSentinelComment
        h = p.h
        if (end) {
            h = h.replace(start, "")
            h = h.replace(end, "")
        }
        return h
    }
    //@+node:ekr.20211016085907.113: *5* at.putLeadInSentinel
    public putLeadInSentinel(s: string, i: number, j: number, delta): void {
        /** 
         * Set at.leadingWs as needed for @+others and @+<< sentinels.
         *
         * i points at the start of a line.
         * j points at @others or a section reference.
         * delta is the change in at.indent that is about to happen and hasn't happened yet.
         */
        at = this
        at.leadingWs = ""  /* Set the default. */
        if (i == j) {
            return  /* The @others or ref starts a line. */
        }
        k = g.skip_ws(s, i)
        if (j == k) {
            /* Only whitespace before the @others or ref. */
            at.leadingWs = s[
                i:j]  /* Remember the leading whitespace, including its spelling. */
        }
        else {
            this.putIndent(at.indent)  /* 1/29/04: fix bug reported by Dan Winkler. */
            at.os(s[i:j])
            at.onl_sent()
        }
    }
    //@+node:ekr.20211016085907.114: *5* at.putCloseNodeSentinel
    public putCloseNodeSentinel(p: Position): void {
        /* End a node. */
        at = this
        at.raw = False  /* Bug fix: 2010/07/04 */
    }
    //@+node:ekr.20211016085907.115: *5* at.putOpenLeoSentinel 4.x
    public putOpenLeoSentinel(s: string): void {
        /* Write @+leo sentinel. */
        at = this
        if (at.sentinels or hasattr(at, 'force_sentinels')) {
            s = s + "-thin"
            encoding = at.encoding.lower()
            if (encoding != "utf-8") {
                /* New in 4.2: encoding fields end in ",." */
                s = s + f"-encoding={encoding},."
            }
            at.putSentinel(s)
        }
    }
    //@+node:ekr.20211016085907.116: *5* at.putOpenNodeSentinel
    public putOpenNodeSentinel(p: Position, inAtAll=False): void {
        /* Write @+node sentinel for p. */
        /* Note: lineNumbers.py overrides this method. */
        at = this
        if (not inAtAll and p.isAtFileNode() and p != at.root) {
            at.writeError("@file not valid in: " + p.h)
            return
        }
        s = at.nodeSentinelText(p)
        at.putSentinel("@+node:" + s)
        /* Leo 4.7 b2: we never write tnodeLists. */
    }
    //@+node:ekr.20211016085907.117: *5* at.putSentinel (applies cweb hack) 4.x
    public putSentinel(s: string): void {
        /** 
         * Write a sentinel whose text is s, applying the CWEB hack if needed.
         *
         * This method outputs all sentinels.
         */
        at = this
        if (at.sentinels or hasattr(at, 'force_sentinels')) {
            at.putIndent(at.indent)
            at.os(at.startSentinelComment)
            /* #2194. The following would follow the black convention, */
            /* but doing so is a dubious idea. */
                /* at.os('  ') */
            /* Apply the cweb hack to s: */
            /* If the opening comment delim ends in '@', */
            /* double all '@' signs except the first. */
            start = at.startSentinelComment
            if (start and start[-1] == '@') {
                s = s.replace('@', '@@')[1:]
            }
            at.os(s)
            if (at.endSentinelComment) {
                at.os(at.endSentinelComment)
            }
            at.onl()
        }
    }
    //@+node:ekr.20211016085907.118: *4* Writing utils...
    //@+node:ekr.20211016085907.119: *5* at.addToOrphanList
    public addToOrphanList(root): void {
        /* Mark the root as erroneous for c.raise_error_dialogs(). */
        c = this.c
        /* Fix #1050: */
        root.setOrphan()
        c.orphan_at_file_nodes.append(root.h)
    }
    //@+node:ekr.20211016085907.120: *5* at.isWritable
    public isWritable(path): void {
        /* Return True if the path is writable. */
        try {
            /* os.access() may not exist on all platforms. */
            ok = os.access(path, os.W_OK)
        }
        except (AttributeError) {
            return True
        }
        if (not ok) {
            g.es('read only:', repr(path), color='red')
        }
        return ok
    }
    //@+node:ekr.20211016085907.121: *5* at.checkPythonCode & helpers
    public checkPythonCode(contents, fileName, root, pyflakes_errors_only=False): void {
        /* Perform python-related checks on root. */
        at = this
        if (
            contents and fileName and fileName.endswith('.py')
            and at.checkPythonCodeOnWrite
        ):
            /* It's too slow to check each node separately. */
            if (pyflakes_errors_only) {
                ok = True
            }
            else {
                ok = at.checkPythonSyntax(root, contents)
            }
            /* Syntax checking catches most indentation problems. */
                /* if ok: at.tabNannyNode(root,s) */
            if (ok and at.runPyFlakesOnWrite and not g.unitTesting) {
                ok2 = this.runPyflakes(root, pyflakes_errors_only=pyflakes_errors_only)
            }
            else {
                ok2 = True
            }
            if (not ok or not ok2) {
                g.app.syntax_error_files.append(g.shortFileName(fileName))
            }
    }
    //@+node:ekr.20211016085907.122: *6* at.checkPythonSyntax
    public checkPythonSyntax(p: Position, body, supress=False): void {
        at = this
        try {
            body = body.replace('\r', '')
            fn = f"<node: {p.h}>"
            compile(body + '\n', fn, 'exec')
            return True
        }
        except (SyntaxError) {
            if (not supress) {
                at.syntaxError(p, body)
            }
        }
        except (Exception) {
            g.trace("unexpected exception")
            g.es_exception()
        }
        return False
    }
    //@+node:ekr.20211016085907.123: *7* at.syntaxError (leoAtFile)
    public syntaxError(p: Position, body): void {
        /* Report a syntax error. */
        g.error(f"Syntax error in: {p.h}")
        typ, val, tb = sys.exc_info()
        message = hasattr(val, 'message') and val.message
        if (message) {
            g.es_print(message)
        }
        if (val is None) {
            return
        }
        lines = g.splitLines(body)
        n = val.lineno
        offset = val.offset or 0
        if (n is None) {
            return
        }
        i = val.lineno - 1
        for (j in range(max(0, i - 2), min(i + 2, len(lines) - 1))) {
            line = lines[j].rstrip()
            if (j == i) {
                unl = p.get_UNL(with_proto=True, with_count=True)
                g.es_print(f"{j+1:5}:* {line}", nodeLink=f"{unl},-{j+1:d}")  /* Global line. */
                g.es_print(' ' * (7 + offset) + '^')
            }
            else {
                g.es_print(f"{j+1:5}: {line}")
            }
        }
    }
    //@+node:ekr.20211016085907.124: *6* at.runPyflakes
    public runPyflakes(root, pyflakes_errors_only): void {
        /* Run pyflakes on the selected node. */
        try {
            from leo.commands import checkerCommands
            if (checkerCommands.pyflakes) {
                x = checkerCommands.PyflakesCommand(this.c)
                ok = x.run(p=root, pyflakes_errors_only=pyflakes_errors_only)
                return ok
            }
            return True  /* Suppress error if pyflakes can not be imported. */
        }
        except (Exception) {
            g.es_exception()
            return False
        }
    }
    //@+node:ekr.20211016085907.125: *6* at.tabNannyNode
    public tabNannyNode(p: Position, body): void {
        try {
            readline = g.ReadLinesClass(body).next
            tabnanny.process_tokens(tokenize.generate_tokens(readline))
        }
        except (IndentationError) {
            if (g.unitTesting) {
                raise
            }
            junk2, msg, junk = sys.exc_info()
            g.error("IndentationError in", p.h)
            g.es('', str(msg))
        }
        except (tokenize.TokenError) {
            if (g.unitTesting) {
                raise
            }
            junk3, msg, junk = sys.exc_info()
            g.error("TokenError in", p.h)
            g.es('', str(msg))
        }
        except (tabnanny.NannyNag) {
            if (g.unitTesting) {
                raise
            }
            junk4, nag, junk = sys.exc_info()
            badline = nag.get_lineno()
            line = nag.get_line()
            message = nag.get_msg()
            g.error("indentation error in", p.h, "line", badline)
            g.es(message)
            line2 = repr(str(line))[1:-1]
            g.es("offending line:\n", line2)
        }
        except (Exception) {
            g.trace("unexpected exception")
            g.es_exception()
            raise
        }
    }
    //@+node:ekr.20211016085907.126: *5* at.directiveKind4 (write logic)
    /* These patterns exclude constructs such as @encoding.setter or @encoding(whatever) */
    /* However, they must allow @language typescript, @nocolor-node, etc. */

    at_directive_kind_pattern = re.compile(r'\s*@([\w-]+)\s*')

    public directiveKind4(s: string, i: number): void {
        /** 
         * Return the kind of at-directive or noDirective.
         *
         * Potential simplifications:
         * - Using strings instead of constants.
         * - Using additional regex's to recognize directives.
         */
        at = this
        n = len(s)
        if (i >= n or s[i] != '@') {
            j = g.skip_ws(s, i)
            if (g.match_word(s, j, "@others")) {
                return at.othersDirective
            }
            if (g.match_word(s, j, "@all")) {
                return at.allDirective
            }
            return at.noDirective
        }
        table = (
            ("@all", at.allDirective),
            ("@c", at.cDirective),
            ("@code", at.codeDirective),
            ("@doc", at.docDirective),
            ("@end_raw", at.endRawDirective),
            ("@others", at.othersDirective),
            ("@raw", at.rawDirective),
            ("@verbatim", at.startVerbatim))
        /* Rewritten 6/8/2005. */
        if (i + 1 >= n or s[i + 1] in (' ', '\t', '\n')) {
            /* Bare '@' not recognized in cweb mode. */
            return at.noDirective if at.language == "cweb" else at.atDirective
        }
        if (not s[i + 1].isalpha()) {
            return at.noDirective  /* Bug fix: do NOT return miscDirective here! */
        }
        if (at.language == "cweb" and g.match_word(s, i, '@c')) {
            return at.noDirective
        }
        for (name, directive in table) {
            if (g.match_word(s, i, name)) {
                return directive
            }
        }
        /* Support for add_directives plugin. */
        /* Use regex to properly distinguish between Leo directives */
        /* and python decorators. */
        s2 = s[i:]
        m = this.at_directive_kind_pattern.match(s2)
        if (m) {
            word = m.group(1)
            if (word not in g.globalDirectiveList) {
                return at.noDirective
            }
            s3 = s2[m.end(1) :]
            if (s3 and s3[0] in ".(") {
                return at.noDirective
            }
            return at.miscDirective
        }
        return at.noDirective
    }
    //@+node:ekr.20211016085907.127: *5* at.isSectionName
    /* returns (flag, end). end is the index of the character after the section name. */

    public isSectionName(s: string, i: number): void {
        /* 2013/08/01: bug fix: allow leading periods. */
        while (i < len(s) and s[i] == '.') {
            i += 1
        }
        if (not g.match(s, i, "<<")) {
            return False, -1
        }
        i = g.find_on_line(s, i, ">>")
        if (i > -1) {
            return True, i + 2
        }
        return False, -1
    }
    //@+node:ekr.20211016085907.128: *5* at.os and allies
    //@+node:ekr.20211016085907.129: *6* at.oblank, oblanks & otabs
    public oblank(): void {
        this.os(' ')
    }

    public oblanks(n: number): void {
        this.os(' ' * abs(n))
    }

    public otabs(n: number): void {
        this.os('\t' * abs(n))
    }
    //@+node:ekr.20211016085907.130: *6* at.onl & onl_sent
    public onl(): void {
        /* Write a newline to the output stream. */
        this.os('\n')  /* **not** this.output_newline */
    }

    public onl_sent(): void {
        /* Write a newline to the output stream, provided we are outputting sentinels. */
        if (this.sentinels) {
            this.onl()
        }
    }
    //@+node:ekr.20211016085907.131: *6* at.os
    public os(s: string): void {
        /** 
         * Append a string to at.outputList.
         *
         * All output produced by leoAtFile module goes here.
         */
        at = this
        if (s.startswith(this.underindentEscapeString)) {
            try {
                junk, s = at.parseUnderindentTag(s)
            }
            except (Exception) {
                at.exception("exception writing:" + s)
                return
            }
        }
        s = g.toUnicode(s, at.encoding)
        at.outputList.append(s)
    }
    //@+node:ekr.20211016085907.132: *5* at.outputStringWithLineEndings
    public outputStringWithLineEndings(s: string): void {
        /** 
         * Write the string s as-is except that we replace '\n' with the proper line ending.
         *
         * Calling this.onl() runs afoul of queued newlines.
         */
        at = this
        s = g.toUnicode(s, at.encoding)
        s = s.replace('\n', at.output_newline)
        this.os(s)
    }
    //@+node:ekr.20211016085907.133: *5* at.precheck (calls shouldPrompt...)
    public precheck(fileName, root): void {
        /** 
         * Check whether a dirty, potentially dangerous, file should be written.
         *
         * Return True if so.  Return False *and* issue a warning otherwise.
         */
        at = this
        /*  */
        /* #1450: First, check that the directory exists. */
        theDir = g.os_path_dirname(fileName)
        if (theDir and not g.os_path_exists(theDir)) {
            at.error(f"Directory not found:\n{theDir}")
            return False
        }
        /*  */
        /* Now check the file. */
        if (not at.shouldPromptForDangerousWrite(fileName, root)) {
            /* Fix bug 889175: Remember the full fileName. */
            at.rememberReadPath(fileName, root)
            return True
        }
        /*  */
        /* Prompt if the write would overwrite the existing file. */
        ok = this.promptForDangerousWrite(fileName)
        if (ok) {
            /* Fix bug 889175: Remember the full fileName. */
            at.rememberReadPath(fileName, root)
            return True
        }
        /*  */
        /* Fix #1031: do not add @ignore here! */
        g.es("not written:", fileName)
        return False
    }
    //@+node:ekr.20211016085907.134: *5* at.putAtFirstLines
    public putAtFirstLines(s: string): void {
        /** 
         * Write any @firstlines from string s.
         * These lines are converted to @verbatim lines,
         * so the read logic simply ignores lines preceding the @+leo sentinel.
         */
        at = this
        tag = "@first"
        i = 0
        while (g.match(s, i, tag)) {
            i += len(tag)
            i = g.skip_ws(s, i)
            j = i
            i = g.skip_to_end_of_line(s, i)
            /* Write @first line, whether empty or not */
            line = s[j:i]
            at.os(line)
            at.onl()
            i = g.skip_nl(s, i)
        }
    }
    //@+node:ekr.20211016085907.135: *5* at.putAtLastLines
    public putAtLastLines(s: string): void {
        /** 
         * Write any @last lines from string s.
         * These lines are converted to @verbatim lines,
         * so the read logic simply ignores lines following the @-leo sentinel.
         */
        at = this
        tag = "@last"
        /* Use g.splitLines to preserve trailing newlines. */
        lines = g.splitLines(s)
        n = len(lines)
        j = k = n - 1
        /* Scan backwards for @last directives. */
        while (j >= 0) {
            line = lines[j]
            if (g.match(line, 0, tag)) {
                j -= 1
            }
            else {
                if (not line.strip()) {
                    j -= 1
                }
            }
            else { // break
            }
        }
        /* Write the @last lines. */
        for (line in lines[j + 1) { // k + 1]:
            if (g.match(line, 0, tag)) {
                i = len(tag)
                i = g.skip_ws(line, i)
                at.os(line[i:])
            }
        }
    }
    //@+node:ekr.20211016085907.136: *5* at.putDirective & helper
    /*
     * Output a sentinel a directive or reference s.

     * It is important for PHP and other situations that \@first and \@last
     * directives get translated to verbatim lines that do *not* include what
     * follows the @first & @last directives.
    */
    public putDirective(s: string, i: number, p: Position): void {
        
        at = self
        k = i
        j = g.skip_to_end_of_line(s, i)
        directive = s[i:j]
        if (g.match_word(s, k, "@delims")) {
            at.putDelims(directive, s, k)
        }
        elif g.match_word(s, k, "@language"):
            self.putSentinel("@" + directive)
        elif g.match_word(s, k, "@comment"):
            self.putSentinel("@" + directive)
        elif g.match_word(s, k, "@last"):
            /* #1307. */
            if (p.isAtCleanNode()) {
                at.error(f"ignoring @last directive in {p.h!r}")
                g.es_print('@last is not valid in @clean nodes')
            }
            /* #1297. */
            elif g.app.inScript or g.unitTesting or p.isAnyAtFileNode():
                self.putSentinel("@@last")
                    /* Convert to an verbatim line _without_ anything else. */
            else {
                at.error(f"ignoring @last directive in {p.h!r}")
            }
        elif g.match_word(s, k, "@first"):
            /* #1307. */
            if (p.isAtCleanNode()) {
                at.error(f"ignoring @first directive in {p.h!r}")
                g.es_print('@first is not valid in @clean nodes')
            }
            /* #1297. */
            elif g.app.inScript or g.unitTesting or p.isAnyAtFileNode():
                self.putSentinel("@@first")
                    /* Convert to an verbatim line _without_ anything else. */
            else {
                at.error(f"ignoring @first directive in {p.h!r}")
            }
        else {
            self.putSentinel("@" + directive)
        }
        i = g.skip_line(s, k)
        return i
    }
    //@+node:ekr.20211016085907.137: *6* at.putDelims
    public putDelims(directive, s: string, k: number): void {
        /* Put an @delims directive. */
        at = this
        /* Put a space to protect the last delim. */
        at.putSentinel(directive + " ")  /* 10/23/02: put @delims, not @@delims */
        /* Skip the keyword and whitespace. */
        j = i = g.skip_ws(s, k + len("@delims"))
        /* Get the first delim. */
        while (i < len(s) and not g.is_ws(s[i]) and not g.is_nl(s, i)) {
            i += 1
        }
        if (j < i) {
            at.startSentinelComment = s[j:i]
            /* Get the optional second delim. */
            j = i = g.skip_ws(s, i)
            while (i < len(s) and not g.is_ws(s[i]) and not g.is_nl(s, i)) {
                i += 1
            }
            at.endSentinelComment = s[j:i] if j < i else ""
        }
        else {
            at.writeError("Bad @delims directive")
        }
    }
    //@+node:ekr.20211016085907.138: *5* at.putIndent
    public putIndent(n: number, s=''): void {
        /** Put tabs and spaces corresponding to n spaces,
         * assuming that we are at the start of a line.
         *
         * Remove extra blanks if the line starts with the underindentEscapeString
         */
        tag = this.underindentEscapeString
        if (s.startswith(tag)) {
            n2, s2 = this.parseUnderindentTag(s)
            if (n2 >= n) {
                return
            }
            if (n > 0) {
                n -= n2
            }
            else {
                n += n2
            }
        }
        if (n > 0) {
            w = this.tab_width
            if (w > 1) {
                q, r = divmod(n, w)
                this.otabs(q)
                this.oblanks(r)
            }
            else {
                this.oblanks(n)
            }
        }
    }
    //@+node:ekr.20211016085907.139: *5* at.putInitialComment
    public putInitialComment(): void {
        c = this.c
        s2 = c.config.output_initial_comment
        if (s2) {
            lines = s2.split("\\n")
            for (line in lines) {
                line = line.replace("@date", time.asctime())
                if (line) {
                    this.putSentinel("@comment " + line)
                }
            }
        }
    }
    //@+node:ekr.20211016085907.140: *5* at.replaceFile & helpers
    public replaceFile(contents, encoding, fileName, root, ignoreBlankLines=False): void {
        /** 
         * Write or create the given file from the contents.
         * Return True if the original file was changed.
         */
        at, c = this, this.c
        if (root) {
            root.clearDirty()
        }
        /*  */
        /* Create the timestamp (only for messages). */
        if (c.config.getBool('log-show-save-time', default=False)) {
            format = c.config.getString('log-timestamp-format') or "%H:%M:%S"
            timestamp = time.strftime(format) + ' '
        }
        else {
            timestamp = ''
        }
        /*  */
        /* Adjust the contents. */
        assert isinstance(contents, str), g.callers()
        if (at.output_newline != '\n') {
            contents = contents.replace('\r', '').replace('\n', at.output_newline)
        }
        /*  */
        /* If file does not exist, create it from the contents. */
        fileName = g.os_path_realpath(fileName)
        sfn = g.shortFileName(fileName)
        if (not g.os_path_exists(fileName)) {
            ok = g.writeFile(contents, encoding, fileName)
            if (ok) {
                c.setFileTimeStamp(fileName)
                if (not g.unitTesting) {
                    g.es(f"{timestamp}created: {fileName}")
                }
                if (root) {
                    /* Fix bug 889175: Remember the full fileName. */
                    at.rememberReadPath(fileName, root)
                    at.checkPythonCode(contents, fileName, root)
                }
            }
            else {
                at.addToOrphanList(root)
            }
            /* No original file to change. Return value tested by a unit test. */
            return False  /* No change to original file. */
        }
        /*  */
        /* Compare the old and new contents. */
        old_contents = g.readFileIntoUnicodeString(fileName,
            encoding=at.encoding, silent=True)
        if (not old_contents) {
            old_contents = ''
        }
        unchanged = (
            contents == old_contents
            or (not at.explicitLineEnding and at.compareIgnoringLineEndings(old_contents, contents))
            or ignoreBlankLines and at.compareIgnoringBlankLines(old_contents, contents))
        if (unchanged) {
            at.unchangedFiles += 1
            if not g.unitTesting and c.config.getBool(
                'report-unchanged-files', default=True):
                g.es(f"{timestamp}unchanged: {sfn}")
            /* Leo 5.6: Check unchanged files. */
            at.checkPythonCode(contents, fileName, root, pyflakes_errors_only=True)
            return False  /* No change to original file. */
        }
        /*  */
        /* Warn if we are only adjusting the line endings. */
        if (at.explicitLineEnding) {
            ok = (
                at.compareIgnoringLineEndings(old_contents, contents) or
                ignoreBlankLines and at.compareIgnoringLineEndings(
                old_contents, contents))
            if (not ok) {
                g.warning("correcting line endings in:", fileName)
            }
        }
        /*  */
        /* Write a changed file. */
        ok = g.writeFile(contents, encoding, fileName)
        if (ok) {
            c.setFileTimeStamp(fileName)
            if (not g.unitTesting) {
                g.es(f"{timestamp}wrote: {sfn}")
            }
        }
        else {
            g.error('error writing', sfn)
            g.es('not written:', sfn)
            at.addToOrphanList(root)
        }
        at.checkPythonCode(contents, fileName, root)
            /* Check *after* writing the file. */
        return ok
    }
    //@+node:ekr.20211016085907.141: *6* at.compareIgnoringBlankLines
    public compareIgnoringBlankLines(s1, s2): void {
        /* Compare two strings, ignoring blank lines. */
        assert isinstance(s1, str), g.callers()
        assert isinstance(s2, str), g.callers()
        if (s1 == s2) {
            return True
        }
        s1 = g.removeBlankLines(s1)
        s2 = g.removeBlankLines(s2)
        return s1 == s2
    }
    //@+node:ekr.20211016085907.142: *6* at.compareIgnoringLineEndings
    public compareIgnoringLineEndings(s1, s2): void {
        /* Compare two strings, ignoring line endings. */
        assert isinstance(s1, str), (repr(s1), g.callers())
        assert isinstance(s2, str), (repr(s2), g.callers())
        if (s1 == s2) {
            return True
        }
        /* Wrong: equivalent to ignoreBlankLines! */
            /* s1 = s1.replace('\n','').replace('\r','') */
            /* s2 = s2.replace('\n','').replace('\r','') */
        s1 = s1.replace('\r', '')
        s2 = s2.replace('\r', '')
        return s1 == s2
    }
    //@+node:ekr.20211016085907.143: *5* at.warnAboutOrpanAndIgnoredNodes
    /* Called from putFile. */

    public warnAboutOrphandAndIgnoredNodes(): void {
        /* Always warn, even when language=="cweb" */
        at, root = this, this.root
        if (at.errors) {
            return  /* No need to repeat this. */
        }
        for (p in root.self_and_subtree(copy=False)) {
            if (not p.v.isVisited()) {
                at.writeError("Orphan node:  " + p.h)
                if (p.hasParent()) {
                    g.blue("parent node:", p.parent().h)
                }
            }
        }
        p = root.copy()
        after = p.nodeAfterTree()
        while (p and p != after) {
            if (p.isAtAllNode()) {
                p.moveToNodeAfterTree()
            }
            else {
                /* #1050: test orphan bit. */
                if (p.isOrphan()) {
                    at.writeError("Orphan node: " + p.h)
                    if (p.hasParent()) {
                        g.blue("parent node:", p.parent().h)
                    }
                }
                p.moveToThreadNext()
            }
        }
    }
    //@+node:ekr.20211016085907.144: *5* at.writeError
    public writeError(message): void {
        /* Issue an error while writing an @<file> node. */
        at = this
        if (at.errors == 0) {
            fn = at.targetFileName or 'unnamed file'
            g.es_error(f"errors writing: {fn}")
        }
        at.error(message)
        at.addToOrphanList(at.root)
    }
    //@+node:ekr.20211016085907.145: *5* at.writeException
    public writeException(fileName, root): void {
        at = this
        g.error("exception writing:", fileName)
        g.es_exception()
        if (getattr(at, 'outputFile', None)) {
            at.outputFile.flush()
            at.outputFile.close()
            at.outputFile = None
        }
        at.remove(fileName)
        at.addToOrphanList(root)
    }
    //@+node:ekr.20211016085907.146: *3* at.Utilites
    //@+node:ekr.20211016085907.147: *4* at.error & printError
    public error(*args): void {
        at = this
        at.printError(*args)
        at.errors += 1
    }

    public printError(*args): void {
        /* Print an error message that may contain non-ascii characters. */
        at = this
        if (at.errors) {
            g.error(*args)
        }
        else {
            g.warning(*args)
        }
    }
    //@+node:ekr.20211016085907.148: *4* at.exception
    public exception(message): void {
        this.error(message)
        g.es_exception()
    }
    //@+node:ekr.20211016085907.149: *4* at.file operations...
    /*
     * Error checking versions of corresponding functions in Python's os module.
     */
    //@+node:ekr.20211016085907.150: *5* at.chmod
    public chmod(fileName, mode): void {
        /* Do _not_ call this.error here. */
        if (mode is None) {
            return
        }
        try {
            os.chmod(fileName, mode)
        }
        except (Exception) {
            g.es("exception in os.chmod", fileName)
            g.es_exception()
        }

    }
    //@+node:ekr.20211016085907.151: *5* at.remove
    public remove(fileName): void {
        if (not fileName) {
            g.trace('No file name', g.callers())
            return False
        }
        try {
            os.remove(fileName)
            return True
        }
        except (Exception) {
            if (not g.unitTesting) {
                this.error(f"exception removing: {fileName}")
                g.es_exception()
            }
            return False
        }
    }
    //@+node:ekr.20211016085907.152: *5* at.stat
    public stat(fileName): void {
        /* Return the access mode of named file, removing any setuid, setgid, and sticky bits. */
        /* Do _not_ call this.error here. */
        try {
            mode = (os.stat(fileName))[0] & (7 * 8 * 8 + 7 * 8 + 7)  /* 0777 */
        }
        except (Exception) {
            mode = None
        }
        return mode

    }
    //@+node:ekr.20211016085907.153: *4* at.get/setPathUa
    public getPathUa(p: Position): void {
        if (hasattr(p.v, 'tempAttributes')) {
            d = p.v.tempAttributes.get('read-path', {})
            return d.get('path')
        }
        return ''
    }

    public setPathUa(p: Position, path): void {
        if (not hasattr(p.v, 'tempAttributes')) {
            p.v.tempAttributes = {}
        }
        d = p.v.tempAttributes.get('read-path', {})
        d['path'] = path
        p.v.tempAttributes['read-path'] = d
    }
    //@+node:ekr.20211016085907.154: *4* at.parseUnderindentTag
    /* Important: this is part of the *write* logic. */
    /* It is called from at.os and at.putIndent. */

    public parseUnderindentTag(s: string): void {
        tag = this.underindentEscapeString
        s2 = s[len(tag) :]
        /* To be valid, the escape must be followed by at least one digit. */
        i = 0
        while (i < len(s2) and s2[i].isdigit()) {
            i += 1
        }
        if (i > 0) {
            n = int(s2[:i])
            /* Bug fix: 2012/06/05: remove any period following the count. */
            /* This is a new convention. */
            if (i < len(s2) and s2[i] == '.') {
                i += 1
            }
            return n, s2[i:]
        }
        return 0, s
    }
    //@+node:ekr.20211016085907.155: *4* at.promptForDangerousWrite
    public promptForDangerousWrite(fileName, message=None): void {
        /* Raise a dialog asking the user whether to overwrite an existing file. */
        at, c, root = this, this.c, this.root
        if (at.cancelFlag) {
            assert at.canCancelFlag
            return False
        }
        if (at.yesToAll) {
            assert at.canCancelFlag
            return True
        }
        if (root and root.h.startswith('@auto-rst')) {
            /* Fix bug 50: body text lost switching @file to @auto-rst */
            /* Refuse to convert any @<file> node to @auto-rst. */
            d = root.v.at_read if hasattr(root.v, 'at_read') else {}
            aList = sorted(d.get(fileName, []))
            for (h in aList) {
                if (not h.startswith('@auto-rst')) {
                    g.es('can not convert @file to @auto-rst!', color='red')
                    g.es('reverting to:', h)
                    root.h = h
                    c.redraw()
                    return False
                }
            }
        }
        if (message is None) {
            message = (
                f"{g.splitLongFileName(fileName)}\n"
                f"{g.tr('already exists.')}\n"
                f"{g.tr('Overwrite this file?')}")
        }
        result = g.app.gui.runAskYesNoCancelDialog(c,
            title='Overwrite existing file?',
            yesToAllMessage="Yes To &All",
            message=message,
            cancelMessage="&Cancel (No To All)",
        )
        if (at.canCancelFlag) {
            /* We are in the writeAll logic so these flags can be set. */
            if (result == 'cancel') {
                at.cancelFlag = True
            }
            else {
                if (result == 'yes-to-all') {
                    at.yesToAll = True
                }
            }
        }
        return result in ('yes', 'yes-to-all')
    }
    //@+node:ekr.20211016085907.156: *4* at.rememberReadPath
    public rememberReadPath(fn, p: Position): void {
        /** 
         * Remember the files that have been read *and*
         * the full headline (@<file> type) that caused the read.
         */
        v = p.v
        /* Fix bug #50: body text lost switching @file to @auto-rst */
        if (not hasattr(v, 'at_read')) {
            v.at_read = {}
        }
        d = v.at_read
        aSet = d.get(fn, set())
        aSet.add(p.h)
        d[fn] = aSet
    }
    //@+node:ekr.20211016085907.157: *4* at.scanAllDirectives
    public scanAllDirectives(p: Position): void {
        /** 
         * Scan p and p's ancestors looking for directives,
         * setting corresponding AtFile ivars.
         */
        at, c = this, this.c
        d = c.scanAllDirectives(p)
        /*  */
        /* Language & delims: Tricky. */
        lang_dict = d.get('lang-dict') or {}
        delims, language = None, None
        if (lang_dict) {
            /* There was an @delims or @language directive. */
            language = lang_dict.get('language')
            delims = lang_dict.get('delims')
        }
        if (not language) {
            /* No language directive.  Look for @<file> nodes. */
            /* Do *not* used.get('language')! */
            language = g.getLanguageFromAncestorAtFileNode(p) or 'python'
        }
        at.language = language
        if (not delims) {
            delims = g.set_delims_from_language(language)
        }
        /*  */
        /* Previously, setting delims was sometimes skipped, depending on kwargs. */
        //@+<< Set comment strings from delims >>
        //@+node:ekr.20211016085907.158: *5* << Set comment strings from delims >> (at.scanAllDirectives)
        delim1, delim2, delim3 = delims
        /* Use single-line comments if we have a choice. */
        /* delim1,delim2,delim3 now correspond to line,start,end */
        if (delim1) {
            at.startSentinelComment = delim1
            at.endSentinelComment = ""  /* Must not be None. */
        }
        else {
            if (delim2 and delim3) {
                at.startSentinelComment = delim2
                at.endSentinelComment = delim3
            }
        }
        else { // # Emergency!
            /*  */
            /* Issue an error only if at.language has been set. */
            /* This suppresses a message from the markdown importer. */
            if (not g.unitTesting and at.language) {
                g.trace(repr(at.language), g.callers())
                g.es_print("unknown language: using Python comment delimiters")
                g.es_print("c.target_language:", c.target_language)
            }
            at.startSentinelComment = "  /* "  # This should never happen! */
            at.endSentinelComment = ""
        }
        //@-<< Set comment strings from delims >>
        /*  */
        /* Easy cases */
        at.encoding = d.get('encoding') or c.config.default_derived_file_encoding
        lineending = d.get('lineending')
        at.explicitLineEnding = bool(lineending)
        at.output_newline = lineending or g.getOutputNewline(c=c)
        at.page_width = d.get('pagewidth') or c.page_width
        at.tab_width = d.get('tabwidth') or c.tab_width
        return {
            "encoding": at.encoding,
            "language": at.language,
            "lineending": at.output_newline,
            "pagewidth": at.page_width,
            "path": d.get('path'),
            "tabwidth": at.tab_width,
        }
    }
    //@+node:ekr.20211016085907.159: *4* at.shouldPromptForDangerousWrite
    public shouldPromptForDangerousWrite(fn, p: Position): void {
        /** 
         * Return True if Leo should warn the user that p is an @<file> node that
         * was not read during startup. Writing that file might cause data loss.
         *
         * See #50: https://github.com/leo-editor/leo-editor/issues/50
         */
        trace = 'save' in g.app.debug
        sfn = g.shortFileName(fn)
        c = this.c
        efc = g.app.externalFilesController
        if (p.isAtNoSentFileNode()) {
            /* #1450. */
            /* No danger of overwriting a file. */
            /* It was never read. */
            return False
        }
        if (not g.os_path_exists(fn)) {
            /* No danger of overwriting fn. */
            if (trace) {
                g.trace('Return False: does not exist:', sfn)
            }
            return False
        }
        /* #1347: Prompt if the external file is newer. */
        if (efc) {
            /* Like c.checkFileTimeStamp. */
            if (c.sqlite_connection and c.mFileName == fn) {
                /* sqlite database file is never actually overwriten by Leo, */
                /* so do *not* check its timestamp. */
                pass
            }
            else {
                if (efc.has_changed(fn)) {
                    if (trace) {
                        g.trace('Return True: changed:', sfn)
                    }
                    return True
                }
            }
        }
        if (hasattr(p.v, 'at_read')) {
            /* Fix bug #50: body text lost switching @file to @auto-rst */
            d = p.v.at_read
            for (k in d) {
                /* Fix bug # #1469: make sure k still exists. */
                if (
                    os.path.exists(k) and os.path.samefile(k, fn)
                    and p.h in d.get(k, set())
                ):
                    d[fn] = d[k]
                    if (trace) {
                        g.trace('Return False: in p.v.at_read:', sfn)
                    }
                    return False
            }
            aSet = d.get(fn, set())
            if (trace) {
                g.trace(f"Return {p.h not in aSet()}: p.h not in aSet(): {sfn}")
            }
            return p.h not in aSet
        }
        if (trace) {
            g.trace('Return True: never read:', sfn)
        }
        return True  /* The file was never read. */
    }
    //@+node:ekr.20211016085907.160: *4* at.warnOnReadOnlyFile
    public warnOnReadOnlyFile(fn): void {
        /* os.access() may not exist on all platforms. */
        try {
            read_only = not os.access(fn, os.W_OK)
        }
        except (AttributeError) {
            read_only = False
        }
        if (read_only) {
            g.error("read only:", fn)
        }
    }
    //@-others
}
atFile = AtFile  /* compatibility */
//@+node:ekr.20211016085907.161: ** class FastAtRead
/** 
 * Read an exteral file, created from an @file tree.
 * Written by Vitalije; edited by EKR.
 */
classFastAtRead {

    public constructor(c: Commands, gnx2vnode, test=False, TestVNode=None): void {
        this.c = c
        assert gnx2vnode is not None
        this.gnx2vnode = gnx2vnode  /* The global fc.gnxDict. Keys are gnx's, values are vnodes. */
        this.path = None
        this.root = None
        this.VNode = TestVNode if test else leoNodes.VNode
        this.test = test
    }
    //@+others
    //@+node:ekr.20211016085907.162: *3* fast_at.get_patterns
    /*
     * Create regex patterns for the given comment delims.
     */
    public get_patterns(delims): void {  /// List[regex's] 
        /* This must be a function, because of @comments & @delims. */
        delim_start, delim_end = delims
        delims = re.escape(delim_start), re.escape(delim_end or '')
        delim1, delim2 = delims
        ref = g.angleBrackets(r'(.*)')
        patterns = (
            /* The list of patterns, in alphabetical order. */
            /* These patterns must be mutually exclusive. */
            fr'^\s*{delim1}@afterref{delim2}$',  /* @afterref */
            fr'^(\s*){delim1}@(\+|-)all\b(.*){delim2}$',  /* @all */
            fr'^\s*{delim1}@@c(ode)?{delim2}$',  /* @c and @code */
            fr'^\s*{delim1}@comment(.*){delim2}',  /* @comment */
            fr'^\s*{delim1}@delims(.*){delim2}',  /* @delims */
            fr'^\s*{delim1}@\+(at|doc)?(\s.*?)?{delim2}\n',  /* @doc or @ */
            fr'^\s*{delim1}@end_raw\s*{delim2}',  /* @end_raw */
            fr'^\s*{delim1}@@first{delim2}$',  /* @first */
            fr'^\s*{delim1}@@last{delim2}$',  /* @last */
            fr'^(\s*){delim1}@\+node:([^:]+): \*(\d+)?(\*?) (.*){delim2}$',  /* @node */
            fr'^(\s*){delim1}@(\+|-)others\b(.*){delim2}$',  /* @others */
            fr'^\s*{delim1}@raw(.*){delim2}',  /* @raw */
            fr'^(\s*){delim1}@(\+|-){ref}\s*{delim2}$'  /* section ref */
        )
        /* Return the compiled patterns, in alphabetical order. */
        return (re.compile(pattern) for pattern in patterns)
    }
    //@+node:ekr.20211016085907.163: *3* fast_at.post_pass
    /*
     * Set all body text.
     */
    public post_pass(gnx2body, gnx2vnode, root_v): void {
        if (this.test) {
            /* Check the keys. */
            bkeys = sorted(gnx2body.keys())
            vkeys = sorted(gnx2vnode.keys())
            if (bkeys != vkeys) {
                g.trace('KEYS MISMATCH')
                g.printObj(bkeys)
                g.printObj(vkeys)
                if (this.test) {
                    sys.exit(1)
                }
            }
            /* Set the body text. */
            for (key in vkeys) {
                v = gnx2vnode.get(key)
                body = gnx2body.get(key)
                v._bodyString = ''.join(body)
            }
        }
        else {
            assert root_v.gnx in gnx2vnode, root_v
            assert root_v.gnx in gnx2body, root_v
            for (key in gnx2body) {
                body = gnx2body.get(key)
                v = gnx2vnode.get(key)
                assert v, (key, v)
                v._bodyString = g.toUnicode(''.join(body))
            }
        }
    }
    //@+node:ekr.20211016085907.164: *3* fast_at.scan_header
    header_pattern = re.compile(
        r'''
        ^(.+)@\+leo
        (-ver=(\d+))?
        (-thin)?
        (-encoding=(.*)(\.))?
        (.*)$''',
        re.VERBOSE,
    )

    public scan_header(lines): void {  /// Union[None, Tuple[delims, first_lines, int]
        /** 
         * Scan for the header line, which follows any @first lines.
         * Return (delims, first_lines, i+1) or None
         */
        first_lines: List[str] = []
        i = 0  /* To keep some versions of pylint happy. */
        for (i, line in enumerate(lines)) {
            m = this.header_pattern.match(line)
            if (m) {
                delims = m.group(1), m.group(8) or ''
                return delims, first_lines, i + 1
            }
            first_lines.append(line)
        }
        return None
    }
    //@+node:ekr.20211016085907.165: *3* fast_at.scan_lines
    public scan_lines(delims, first_lines, lines, path, start): void {  /// Tuple(root_v, last_lines)
        /* Scan all lines of the file, creating vnodes. */
        //@+<< init scan_lines >>
        //@+node:ekr.20211016085907.166: *4* << init scan_lines >>
        /*  */
        /* Simple vars... */
        afterref = False  /* A special verbatim line follows @afterref. */
        clone_v = None  /* The root of the clone tree. */
        delim_start, delim_end = delims  /* The start/end delims. */
        doc_skip = (delim_start + '\n', delim_end + '\n')  /* To handle doc parts. */
        first_i = 0  /* Index into first array. */
        in_doc = False  /* True: in @doc parts. */
        in_raw = False  /* True: @raw seen. */
        is_cweb = delim_start == '@q@' and delim_end == '@>'  /* True: cweb hack in effect. */
        indent = 0  /* The current indentation. */
        level_stack = []  /* Entries are (vnode, in_clone_tree) */
        n_last_lines = 0  /* The number of @@last directives seen. */
        /* #1065 so reads will not create spurious child nodes. */
        root_seen = False  /* False: The next +@node sentinel denotes the root, regardless of gnx. */
        sentinel = delim_start + '@'  /* Faster than a regex! */
        /* The stack is updated when at+others, at+<section>, or at+all is seen. */
        stack = []  /* Entries are (gnx, indent, body) */
        verbline = delim_start + '@verbatim' + delim_end + '\n'  /* The spelling of at-verbatim sentinel */
        verbatim = False  /* True: the next line must be added without change. */
        /*  */
        /* Init the data for the root node. */
        /*  */

        /*  */
        /* Init the parent vnode for testing. */
        /*  */
        if (this.test) {
            /* Start with the gnx for the @file node. */
            root_gnx = gnx = 'root-gnx'  /* The node that we are reading. */
            gnx_head = '<hidden top vnode>'  /* The headline of the root node. */
            context = None
            parent_v = this.VNode(context=context, gnx=gnx)
            parent_v._headString = gnx_head  /* Corresponds to the @files node itself. */
        }
        else {
            /* Production. */
            root_gnx = gnx = this.root.gnx
            context = this.c
            parent_v = this.root.v
        }
        root_v = parent_v  /* Does not change. */
        level_stack.append((root_v, False),)
        /*  */
        /* Init the gnx dict last. */
        /*  */
        gnx2vnode = this.gnx2vnode  /* Keys are gnx's, values are vnodes. */
        gnx2body = {}  /* Keys are gnxs, values are list of body lines. */
        gnx2vnode[gnx] = parent_v  /* Add gnx to the keys */
        /* Add gnx to the keys. */
        /* Body is the list of lines presently being accumulated. */
        gnx2body[gnx] = body = first_lines
        /*  */
        /* get the patterns. */
        data = this.get_patterns(delims)
        /* pylint: disable=line-too-long */
        after_pat, all_pat, code_pat, comment_pat, delims_pat, doc_pat, end_raw_pat, first_pat, last_pat, node_start_pat, others_pat, raw_pat, ref_pat = data
        //@-<< init scan_lines >>
        //@+<< define dump_v >>
        //@+node:ekr.20211016085907.167: *4* << define dump_v >>
        public dump_v(): void {
            /* Dump the level stack and v. */
            print('----- LEVEL', level, v.h)
            print('       PARENT', parent_v.h)
            print('[')
            for (i, data in enumerate(level_stack)) {
                v2, in_tree = data
                print(f"{i+1:2} {in_tree:5} {v2.h}")
            }
            print(']')
            print('PARENT.CHILDREN...')
            g.printObj([v3.h for v3 in parent_v.children])
            print('PARENTS...')
            g.printObj([v4.h for v4 in v.parents])

        }
        //@-<< define dump_v >>

        i = 0  /* To keep pylint happy. */
        for (i, line in enumerate(lines[start) { // ]):
            /* Order matters. */
            //@+<< 1. common code for all lines >>
            //@+node:ekr.20211016085907.168: *4* << 1. common code for all lines >>
            if (verbatim) {
                /* We are in raw mode, or other special situation. */
                /* Previous line was verbatim sentinel. Append this line as it is. */
                if (afterref) {
                    afterref = False
                    if (body) { // # a List of lines.
                        body[-1] = body[-1].rstrip() + line
                    }
                    else {
                        body = [line]
                    }
                    verbatim = False
                }
                else {
                    if (in_raw) {
                        m = end_raw_pat.match(line)
                        if (m) {
                            in_raw = False
                            verbatim = False
                        }
                        else {
                            /* Continue verbatim/raw mode. */
                            body.append(line)
                        }
                    }
                }
                else {
                    body.append(line)
                    verbatim = False
                }
                continue
            }
            if (line == verbline) { // # <delim>@verbatim.
                verbatim = True
                continue
            }
            /*  */
            /* Strip the line only once. */
            strip_line = line.strip()
            /*  */
            /* Undo the cweb hack. */
            if (is_cweb and line.startswith(sentinel)) {
                line = line[: len(sentinel)] + line[len(sentinel) :].replace('@@', '@')
            }
            /* Adjust indentation. */
            if (indent and line[) { // indent].isspace() and len(line) > indent:
                line = line[indent:]
            }
            //@-<< 1. common code for all lines >>
            //@+<< 2. short-circuit later tests >>
            //@+node:ekr.20211016085907.169: *4* << 2. short-circuit later tests >>
            /* This is valid because all following sections are either: */
            /* 1. guarded by 'if in_doc' or */
            /* 2. guarded by a pattern that matches the start of the sentinel. */
            /*  */
            if (not in_doc and not strip_line.startswith(sentinel)) {
                /* lstrip() is faster than using a regex! */
                body.append(line)
                continue
            }
            //@-<< 2. short-circuit later tests >>
            //@+<< 3. handle @others >>
            //@+node:ekr.20211016085907.170: *4* << 3. handle @others >>
            m = others_pat.match(line)
            if (m) {
                in_doc = False
                if (m.group(2) == '+') { // # opening sentinel
                    body.append(f"{m.group(1)}@others{m.group(3) or ''}\n")
                    stack.append((gnx, indent, body))
                    indent += m.end(1)  /* adjust current identation */
                }
                else { // # closing sentinel.
                    /* m.group(2) is '-' because the pattern matched. */
                    gnx, indent, body = stack.pop()
                }
                continue
            }
            //@-<< 3. handle @others >>
            //@afterref
  /* clears in_doc */
            //@+<< 4. handle section refs >>
            //@+node:ekr.20211016085907.171: *4* << 4. handle section refs >>
            m = ref_pat.match(line)
            if (m) {
                in_doc = False
                if (m.group(2) == '+') {
                    /* open sentinel. */
                    body.append(m.group(1) + g.angleBrackets(m.group(3)) + '\n')
                    stack.append((gnx, indent, body))
                    indent += m.end(1)
                    continue
                }
                if (stack) {
                    /* #1232: Only if the stack exists. */
                    /* close sentinel. */
                    /* m.group(2) is '-' because the pattern matched. */
                    gnx, indent, body = stack.pop()
                    continue
                }
            }
            //@-<< 4. handle section refs >>
            //@afterref
  /* clears in_doc. */
            /* Order doesn't matter, but match more common sentinels first. */
            //@+<< handle node_start >>
            //@+node:ekr.20211016085907.172: *4* << handle node_start >>
            m = node_start_pat.match(line)
            if (m) {
                in_doc, in_raw = False, False
                gnx, head = m.group(2), m.group(5)
                level = int(m.group(3)) if m.group(3) else 1 + len(m.group(4))
                    /* m.group(3) is the level number, m.group(4) is the number of stars. */
                v = gnx2vnode.get(gnx)
                /*  */
                /* Case 1: The root @file node. Don't change the headline. */
                if (not root_seen) {
                    /* Fix #1064: The node represents the root, regardless of the gnx! */
                    root_seen = True
                    clone_v = None
                    gnx2body[gnx] = body = []
                    if (not v) {
                        /* Fix #1064. */
                        v = root_v
                        /* This message is annoying when using git-diff. */
                            /* if gnx != root_gnx: */
                                /* g.es_print("using gnx from external file: %s" % (v.h), color='blue') */
                        gnx2vnode[gnx] = v
                        v.fileIndex = gnx
                    }
                    v.children = []
                    continue
                }
                /*  */
                /* Case 2: We are scanning the descendants of a clone. */
                parent_v, clone_v = level_stack[level - 2]
                if (v and clone_v) {
                    /* The last version of the body and headline wins.. */
                    gnx2body[gnx] = body = []
                    v._headString = head
                    /* Update the level_stack. */
                    level_stack = level_stack[: level - 1]
                    level_stack.append((v, clone_v),)
                    /* Always clear the children! */
                    v.children = []
                    parent_v.children.append(v)
                    continue
                }
                /*  */
                /* Case 3: we are not already scanning the descendants of a clone. */
                if (v) {
                    /* The *start* of a clone tree. Reset the children. */
                    clone_v = v
                    v.children = []
                }
                else {
                    /* Make a new vnode. */
                    v = this.VNode(context=context, gnx=gnx)
                }
                /*  */
                /* The last version of the body and headline wins. */
                gnx2vnode[gnx] = v
                gnx2body[gnx] = body = []
                v._headString = head
                /*  */
                /* Update the stack. */
                level_stack = level_stack[: level - 1]
                level_stack.append((v, clone_v),)
                /*  */
                /* Update the links. */
                assert v != root_v
                parent_v.children.append(v)
                v.parents.append(parent_v)
                /* dump_v() */
                continue
            }
            //@-<< handle node_start >>
            //@+<< handle end of @doc & @code parts >>
            //@+node:ekr.20211016085907.173: *4* << handle end of @doc & @code parts >>
            if (in_doc) {
                /* When delim_end exists the doc block: */
                /* - begins with the opening delim, alone on its own line */
                /* - ends with the closing delim, alone on its own line. */
                /* Both of these lines should be skipped. */
                /*  */
                /* #1496: Retire the @doc convention. */
                /* An empty line is no longer a sentinel. */
                if (delim_end and line in doc_skip) {
                    /* doc_skip is (delim_start + '\n', delim_end + '\n') */
                    continue
                }
                /*  */
                /* Check for @c or @code. */
                m = code_pat.match(line)
                if (m) {
                    in_doc = False
                    body.append('@code\n' if m.group(1) else '@c\n')
                    continue
                }
            }
            else {
                m = doc_pat.match(line)
                if (m) {
                    /* @+at or @+doc? */
                    doc = '@doc' if m.group(1) == 'doc' else '@'
                    doc2 = m.group(2) or ''  /* Trailing text. */
                    if (doc2) {
                        body.append(f"{doc}{doc2}\n")
                    }
                    else {
                        body.append(doc + '\n')
                    }
                    /* Enter @doc mode. */
                    in_doc = True
                    continue
                }
            }
            //@-<< handle end of @doc & @code parts >>
            //@+<< handle @all >>
            //@+node:ekr.20211016085907.174: *4* << handle @all >>
            m = all_pat.match(line)
            if (m) {
                /* @all tells Leo's *write* code not to check for undefined sections. */
                /* Here, in the read code, we merely need to add it to the body. */
                /* Pushing and popping the stack may not be necessary, but it can't hurt. */
                if (m.group(2) == '+') { // # opening sentinel
                    body.append(f"{m.group(1)}@all{m.group(3) or ''}\n")
                    stack.append((gnx, indent, body))
                }
                else { // # closing sentinel.
                    /* m.group(2) is '-' because the pattern matched. */
                    gnx, indent, body = stack.pop()
                    gnx2body[gnx] = body
                }
                continue
            }
            //@-<< handle @all >>
            //@+<< handle afterref >>
            //@+node:ekr.20211016085907.175: *4* << handle afterref >>
            m = after_pat.match(line)
            if (m) {
                afterref = True
                verbatim = True
                    /* Avoid an extra test in the main loop. */
                continue
            }
            //@-<< handle afterref >>
            //@+<< handle @first and @last >>
            //@+node:ekr.20211016085907.176: *4* << handle @first and @last >>
            m = first_pat.match(line)
            if (m) {
                if (0 <= first_i < len(first_lines)) {
                    body.append('@first ' + first_lines[first_i])
                    first_i += 1
                }
                else {
                    g.trace(f"\ntoo many @first lines: {path}")
                    print('@first is valid only at the start of @<file> nodes\n')
                    g.printObj(first_lines, tag='first_lines')
                    g.printObj(lines[start : i + 2], tag='lines[start:i+2]')
                }
                continue
            }
            m = last_pat.match(line)
            if (m) {
                n_last_lines += 1
                continue
            }
            //@-<< handle @first and @last >>
            //@+<< handle @comment >>
            //@+node:ekr.20211016085907.177: *4* << handle @comment >>
            /* http://leoeditor.com/directives.html#part-4-dangerous-directives */
            m = comment_pat.match(line)
            if (m) {
                /* <1, 2 or 3 comment delims> */
                delims = m.group(1).strip()
                /* Whatever happens, retain the @delims line. */
                body.append(f"@comment {delims}\n")
                delim1, delim2, delim3 = g.set_delims_from_string(delims)
                    /* delim1 is always the single-line delimiter. */
                if (delim1) {
                    delim_start, delim_end = delim1, ''
                }
                else {
                    delim_start, delim_end = delim2, delim3
                }
                /*  */
                /* Within these delimiters: */
                /* - double underscores represent a newline. */
                /* - underscores represent a significant space, */
                delim_start = delim_start.replace('__', '\n').replace('_', ' ')
                delim_end = delim_end.replace('__', '\n').replace('_', ' ')
                /* Recalculate all delim-related values */
                doc_skip = (delim_start + '\n', delim_end + '\n')
                is_cweb = delim_start == '@q@' and delim_end == '@>'
                sentinel = delim_start + '@'
                /*  */
                /* Recalculate the patterns. */
                delims = delim_start, delim_end
                (
                    after_pat, all_pat, code_pat, comment_pat, delims_pat,
                    doc_pat, end_raw_pat, first_pat, last_pat,
                    node_start_pat, others_pat, raw_pat, ref_pat
                ) = this.get_patterns(delims)
                continue
            }
            //@-<< handle @comment >>
            //@+<< handle @delims >>
            //@+node:ekr.20211016085907.178: *4* << handle @delims >>
            m = delims_pat.match(line)
            if (m) {
                /* Get 1 or 2 comment delims */
                /* Whatever happens, retain the original @delims line. */
                delims = m.group(1).strip()
                body.append(f"@delims {delims}\n")
                /*  */
                /* Parse the delims. */
                delims_pat = re.compile(r'^([^ ]+)\s*([^ ]+)?')
                m2 = delims_pat.match(delims)
                if (not m2) {
                    g.trace(f"Ignoring invalid @comment: {line!r}")
                    continue
                }
                delim_start = m2.group(1)
                delim_end = m2.group(2) or ''
                /*  */
                /* Within these delimiters: */
                /* - double underscores represent a newline. */
                /* - underscores represent a significant space, */
                delim_start = delim_start.replace('__', '\n').replace('_', ' ')
                delim_end = delim_end.replace('__', '\n').replace('_', ' ')
                /* Recalculate all delim-related values */
                doc_skip = (delim_start + '\n', delim_end + '\n')
                is_cweb = delim_start == '@q@' and delim_end == '@>'
                sentinel = delim_start + '@'
                /*  */
                /* Recalculate the patterns */
                delims = delim_start, delim_end
                (
                    after_pat, all_pat, code_pat, comment_pat, delims_pat,
                    doc_pat, end_raw_pat, first_pat, last_pat,
                    node_start_pat, others_pat, raw_pat, ref_pat
                ) = this.get_patterns(delims)
                continue
            }
            //@-<< handle @delims >>
            //@+<< handle @raw >>
            //@+node:ekr.20211016085907.179: *4* << handle @raw >>
            /* http://leoeditor.com/directives.html#part-4-dangerous-directives */
            m = raw_pat.match(line)
            if (m) {
                in_raw = True
                verbatim = True
                    /* Avoid an extra test in the main loop. */
                continue
            }
            //@-<< handle @raw >>
            //@+<< handle @-leo >>
            //@+node:ekr.20211016085907.180: *4* << handle @-leo >>
            if (line.startswith(delim_start + '@-leo')) {
                i += 1
                break
            }
            //@-<< handle @-leo >>
            /* These must be last, in this order. */
            //@+<< Last 1. handle remaining @@ lines >>
            //@+node:ekr.20211016085907.181: *4* << Last 1. handle remaining @@ lines >>
            /* @first, @last, @delims and @comment generate @@ sentinels, */
            /* So this must follow all of those. */
            if (line.startswith(delim_start + '@@')) {
                ii = len(delim_start) + 1  /* on second '@' */
                jj = line.rfind(delim_end) if delim_end else -1
                body.append(line[ii:jj] + '\n')
                continue
            }
            //@-<< Last 1. handle remaining @@ lines >>
            //@+<< Last 2. handle remaining @doc lines >>
            //@+node:ekr.20211016085907.182: *4* << Last 2. handle remaining @doc lines >>
            if (in_doc) {
                if (delim_end) {
                    /* doc lines are unchanged. */
                    body.append(line)
                    continue
                }
                /* Doc lines start with start_delim + one blank. */
                /* #1496: Retire the @doc convention. */
                /* #2194: Strip lws. */
                tail = line.lstrip()[len(delim_start) + 1 :]
                if (tail.strip()) {
                    body.append(tail)
                }
                else {
                    body.append('\n')
                }
                continue
            }
            //@-<< Last 2. handle remaining @doc lines >>
            //@+<< Last 3. handle remaining @ lines >>
            //@+node:ekr.20211016085907.183: *4* << Last 3. handle remaining @ lines >>
            /* Handle an apparent sentinel line. */
            /* This *can* happen after the git-diff or refresh-from-disk commands. */
            /*  */
            /* This assert verifies the short-circuit test. */
            assert strip_line.startswith(sentinel), (repr(sentinel), repr(line))
            /*  */
            /* #2213: *Do* insert the line, with a warning. */
            g.trace(
                f"{g.shortFileName(this.path)}: "
                f"warning: inserting unexpected line: {line.rstrip()!r}"
            )
            body.append(line)
            //@-<< Last 3. handle remaining @ lines >>
        }
        else {
            /* No @-leo sentinel */
            return None, []
        }
        /* Handle @last lines. */
        last_lines = lines[start + i :]
        if (last_lines) {
            last_lines = ['@last ' + z for z in last_lines]
            gnx2body[root_gnx] = gnx2body[root_gnx] + last_lines
        }
        this.post_pass(gnx2body, gnx2vnode, root_v)
        return root_v, last_lines
    }
    //@+node:ekr.20211016085907.184: *3* fast_at.read_into_root
    /** 
     * Parse the file's contents, creating a tree of vnodes
     * anchored in root.v.
     */
    public read_into_root(contents, path, root): bool {

        trace = False
        t1 = time.process_time()
        this.path = path
        this.root = root
        sfn = g.shortFileName(path)
        contents = contents.replace('\r', '')
        lines = g.splitLines(contents)
        data = this.scan_header(lines)
        if (not data) {
            g.trace(f"Invalid external file: {sfn}")
            return False
        }
        /* Clear all children. */
        /* Previously, this had been done in readOpenFile. */
        root.v._deleteAllChildren()
        delims, first_lines, start_i = data
        this.scan_lines(delims, first_lines, lines, path, start_i)
        if (trace) {
            t2 = time.process_time()
            g.trace(f"{t2 - t1:5.2f} sec. {path}")
        }
        return True
    }
    //@-others
}
//@-others
//@@language typescript
//@@tabwidth -4
//@@pagewidth 60

//@-leo
