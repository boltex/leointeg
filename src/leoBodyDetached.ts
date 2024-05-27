import * as vscode from "vscode";
import * as utils from "./utils";
import { Constants } from "./constants";
import * as path from 'path';
import { LeoIntegration } from "./leoIntegration";
import { ArchivedPosition, BodyTimeInfo } from "./types";

/**
 * * Body panes implementation as a file system using "leointegDetached" as a scheme identifier
 */
export class LeoBodyDetachedProvider implements vscode.FileSystemProvider {

    // * Flag normally false
    public preventSaveToLeo: boolean = false;

    // * Last file read data with the readFile method
    private _lastGnx: string = ""; // gnx of last file read
    private _lastBodyData: string = ""; // body content of last file read

    // * List of currently VISIBLE opened body panes gnx (from 'watch' & 'dispose' methods)
    public watchedBodiesGnx: string[] = [];

    // * List of gnx open in tab(s) (from tryApplyNodeToBody / switchBody and fs.delete)
    public openedBodiesVNodes: { [key: string]: ArchivedPosition } = {};
    private _openedBodiesInfo: { [key: string]: BodyTimeInfo } = {};

    // * An event to signal that a resource has been changed
    // * It should fire for resources that are being watched by clients of this provider
    private _onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFileEmitter.event;
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    constructor(private _leoIntegration: LeoIntegration) { }

    /**
     * * Sets selected node body's modified time for this gnx virtual file
     * @param p_uri URI of file for which to set made-up modified time
     */
    public setNewBodyUriTime(p_uri: vscode.Uri, v: ArchivedPosition): void {
        const w_gnx = utils.leoUriToStr(p_uri);
        this._setOpenedBodyTime(w_gnx);
        this.openedBodiesVNodes[w_gnx] = v;
    }

    /**
     * * Adds entries in _openedBodiesGnx and _openedBodiesInfo if needed
     * * and sets the modified time of an opened body.
     */
    private _setOpenedBodyTime(p_gnx: string): void {
        const w_now = new Date().getTime();
        let w_created = w_now;
        if (this._openedBodiesInfo[p_gnx]) {
            w_created = this._openedBodiesInfo[p_gnx].ctime; // Already created?
        }

        this._openedBodiesInfo[p_gnx] = {
            ctime: w_created,
            mtime: w_now // new 'modified' time.
        };
    }

    /**
     * Remove entries of openedBodies if not in any tabGroups
     * * This matches _hideBodiesUnknownToFileSys from leoUI !
    */
    public cleanupDetachedBodies(): void {
        const w_openedBodiesKeys = Object.keys(this._openedBodiesInfo);
        if (!w_openedBodiesKeys.length) {
            return; // Return if not even one to remove.
        }
        const w_foundTabsGnx: string[] = [];
        vscode.window.tabGroups.all.forEach((p_tabGroup) => {
            p_tabGroup.tabs.forEach((p_tab) => {
                if (p_tab.input &&
                    (p_tab.input as vscode.TabInputText).uri &&
                    (p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_DETACHED_SCHEME
                ) {
                    w_foundTabsGnx.push(utils.leoUriToStr((p_tab.input as vscode.TabInputText).uri));
                }
            });
        });

        for (const openBody of Object.keys(this._openedBodiesInfo)) {
            if (!w_foundTabsGnx.includes(openBody)) {
                // Not an opened tab! remove it!
                delete this._openedBodiesInfo[openBody];
                delete this.openedBodiesVNodes[openBody];
            }
        }
    }

    /**
     * * Refresh the body pane for a particular gnx by telling vscode that the file from the Leo file provider has changed
     * @param p_gnx Gnx of body associated with this virtual file, mostly Leo's selected node
     */
    public fireRefreshFile(p_gnx: string): void {

        this._setOpenedBodyTime(p_gnx);

        if (!this.watchedBodiesGnx.includes(p_gnx)) {
            // * Should only be called if vscode.window.tabGroups contained an opened detached body.
            console.log('called fireRefreshFile on an unwatched DETACHED !', p_gnx);
            return; // Document is not being watched (closed tab or non-visible non-dirty tab)
        }

        this._onDidChangeFileEmitter.fire([{
            type: vscode.FileChangeType.Changed,
            uri: utils.strToLeoDetachedUri(p_gnx)
        }]);
    }

    public watch(p_resource: vscode.Uri, p_options: { readonly recursive: boolean; readonly excludes: readonly string[] }): vscode.Disposable {
        const w_gnx = utils.leoUriToStr(p_resource);
        if (!this.watchedBodiesGnx.includes(w_gnx)) {
            this.watchedBodiesGnx.push(w_gnx); // add gnx
        }
        // else already in list
        return new vscode.Disposable(() => {
            const w_position = this.watchedBodiesGnx.indexOf(w_gnx); // find and remove it
            if (w_position > -1) {
                this.watchedBodiesGnx.splice(w_position, 1);
                this.cleanupDetachedBodies(); // IF NOT EVEN AN EXISTING TAB (not just hidden)
            }
        });
    }

    public stat(p_uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        if (this._leoIntegration.leoStates.fileOpenedReady) {
            const w_gnx = utils.leoUriToStr(p_uri);

            const w_commanders: Set<string> = new Set();
            const w_detached: Set<string> = new Set(); // same whole gnx string as with setNewBodyUriTime

            for (const p_tabGroup of vscode.window.tabGroups.all) {
                for (const p_tab of p_tabGroup.tabs) {
                    if (p_tab.input &&
                        (p_tab.input as vscode.TabInputText).uri &&
                        (p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_DETACHED_SCHEME
                    ) {
                        // Found detached. 
                        const [unused, id, gnx] = (p_tab.input as vscode.TabInputText).uri.path.split("/");
                        w_commanders.add(id);
                        w_detached.add(utils.leoUriToStr((p_tab.input as vscode.TabInputText).uri));
                    }
                }
            }

            // w_commanders and w_detached are filled up!
            if (p_uri.fsPath.length === 1) {
                return { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 };
            }

            const [unused, id, gnx] = p_uri.path.split("/");

            if (id && !gnx) {
                return { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 };
                // SPECIAL CASE -----------------------------------------------
            } else if (w_gnx === this._lastGnx && this._openedBodiesInfo[this._lastGnx]) {
                return {
                    type: vscode.FileType.File,
                    ctime: this._openedBodiesInfo[this._lastGnx].ctime,
                    mtime: this._openedBodiesInfo[this._lastGnx].mtime,
                    size: this._openedBodiesInfo[this._lastGnx].lastBodyLength!
                };
                // ------------------------------------------------------------
            } else if (this._openedBodiesInfo[w_gnx]) {
                const id = p_uri.path.split("/")[1];
                const bodyGnx = p_uri.path.split("/")[2];

                return this._leoIntegration.sendAction(
                    Constants.LEOBRIDGE.GET_BODY_LENGTH,
                    { "gnx": bodyGnx, "commanderId": id }
                ).then((p_result) => {
                    return Promise.resolve(
                        {
                            type: vscode.FileType.File,
                            ctime: this._openedBodiesInfo[w_gnx].ctime,
                            mtime: this._openedBodiesInfo[w_gnx].mtime,
                            size: p_result.len ? p_result.len : 0
                        }
                    );
                });

                // let c: Commands;
                // let w_v: ArchivedPosition | undefined;
                // const id = p_uri.path.split("/")[1];
                // for (const w_frame of g.app.windowList) {
                //     if (w_frame.c.id.toString() === id) {
                //         c = w_frame.c;
                //         w_v = c.fileCommands.gnxDict[p_uri.path.split("/")[2]];
                //         break;
                //     }
                // }
                // if (w_v) {
                //     return {
                //         type: vscode.FileType.File,
                //         ctime: this._openedBodiesInfo[w_gnx].ctime,
                //         mtime: this._openedBodiesInfo[w_gnx].mtime,
                //         size: Buffer.byteLength(w_v.b, 'utf8') // w_v.b.length
                //     };
                // } else {
                //     console.warn('DETACHED BODY stat: not found!');
                // }
            } else {
                //  should be caught by _onActiveEditorChanged or _changedVisibleTextEditors
                // console.error('DETACHED asked for STAT about file NOT IN _openedBodiesGnx ');
            }
        }
        // throw vscode.FileSystemError.FileNotFound();
        // (Instead of FileNotFound) should be caught by _onActiveEditorChanged or _changedVisibleTextEditors
        return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: 0 };
    }

    public async readFile(p_uri: vscode.Uri): Promise<Uint8Array> {
        if (this._leoIntegration.leoStates.fileOpenedReady) {

            if (p_uri.fsPath.length === 1) { // p_uri.fsPath === '/' || p_uri.fsPath === '\\'
                throw vscode.FileSystemError.FileIsADirectory();
            } else {
                const w_gnx = utils.leoUriToStr(p_uri);

                // * should be caught by _onActiveEditorChanged or _changedVisibleTextEditors
                // if (!this._openedBodiesInfo[w_gnx]) {
                //     console.warn('DETACHED readFile: ERROR File not in _openedBodiesGnx! gnx: ', w_gnx);
                // }
                const id = p_uri.path.split("/")[1];
                const bodyGnx = p_uri.path.split("/")[2];

                // console.log('detached read id: ', id, ' bodyGNX', bodyGnx);
                let w_buffer: Uint8Array;

                // * GET FROM SERVER
                const p_result = await this._leoIntegration.sendAction(
                    Constants.LEOBRIDGE.GET_BODY,
                    { "gnx": bodyGnx, "commanderId": id }
                );

                if (p_result.body) {
                    // console.log('back from read gnx: ', w_gnx, '   - read ok has body');

                    this._lastGnx = w_gnx;
                    this._lastBodyData = p_result.body;
                    if (this.openedBodiesVNodes[w_gnx]) {
                        this.openedBodiesVNodes[w_gnx]._lastBodyData = p_result.body;
                    }
                    w_buffer = Buffer.from(p_result.body);
                    this._openedBodiesInfo[this._lastGnx].lastBodyLength = w_buffer.byteLength;

                } else if (p_result.body === "") {
                    // console.log('back from read gnx: ', w_gnx, '  - read ok has empty body');

                    this._lastGnx = w_gnx;
                    this._lastBodyData = "";
                    if (this.openedBodiesVNodes[w_gnx]) {
                        this.openedBodiesVNodes[w_gnx]._lastBodyData = '';
                    }
                    w_buffer = Buffer.from("");
                    this._openedBodiesInfo[this._lastGnx].lastBodyLength = w_buffer.byteLength;

                } else {
                    this._leoIntegration.fullRefresh();

                    if (this._lastGnx === w_gnx) {
                        // was last gnx of closed file about to be switched to new document selected
                        w_buffer = Buffer.from(this._lastBodyData || "");
                    } else {
                        // * should be caught by _onActiveEditorChanged or _changedVisibleTextEditors
                        //console.error("DETACHED ERROR => readFile of unknown GNX"); // is possibleGnxList updated correctly?

                        //  throw vscode.FileSystemError.FileNotFound();
                        // (Instead of FileNotFound) should be caught by _onActiveEditorChanged or _changedVisibleTextEditors
                        w_buffer = Buffer.from("");
                    }
                }

                return w_buffer;

                // let c: Commands;
                // let w_v: ArchivedPosition | undefined;

                // const id = p_uri.path.split("/")[1];
                // for (const w_frame of g.app.windowList) {
                //     if (w_frame.c.id.toString() === id) {
                //         c = w_frame.c;
                //         w_v = c.fileCommands.gnxDict[p_uri.path.split("/")[2]];
                //         break;
                //     }
                // }

                // if (w_v) {
                //     this._errorRefreshFlag = false; // got body so reset possible flag!
                //     this._lastGnx = w_gnx;
                //     this._lastBodyData = w_v.b;
                //     const w_buffer: Uint8Array = Buffer.from(this._lastBodyData);
                //     return w_buffer;
                // } else {
                //     if (!this._errorRefreshFlag) {
                //         this._leoIntegration.fullRefresh();
                //     }
                //     if (this._lastGnx === w_gnx) {
                //         // was last gnx of closed file about to be switched to new document selected
                //         return Buffer.from(this._lastBodyData);
                //     }
                //     console.error("DETACHED ERROR => readFile of unknown GNX"); // is possibleGnxList updated correctly?
                //     return Buffer.from("");
                // }
            }





        } else {
            throw vscode.FileSystemError.FileNotFound();
        }
    }

    public readDirectory(p_uri: vscode.Uri): [string, vscode.FileType][] {
        const w_commanders: Set<string> = new Set();
        const w_detached: Set<string> = new Set();
        if (this._leoIntegration.leoStates.fileOpenedReady) {

            for (const p_tabGroup of vscode.window.tabGroups.all) {
                for (const p_tab of p_tabGroup.tabs) {
                    if (p_tab.input &&
                        (p_tab.input as vscode.TabInputText).uri &&
                        (p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_DETACHED_SCHEME
                    ) {
                        // Found detached. 
                        const [unused, id, gnx] = (p_tab.input as vscode.TabInputText).uri.path.split("/");
                        w_commanders.add(id);
                        w_detached.add((p_tab.input as vscode.TabInputText).uri.path);
                    }
                }
            }
        }

        if (p_uri.fsPath.length === 1) { // p_uri.fsPath === '/' || p_uri.fsPath === '\\'

            const w_directory: [string, vscode.FileType][] = [];

            for (const w_commander of [...w_commanders]) {
                w_directory.push([w_commander, vscode.FileType.Directory]);
            }
            return w_directory;

        } else if (
            p_uri.path.split('/').length
        ) {

            const w_directory: [string, vscode.FileType][] = [];
            for (const w_file of [...w_detached]) {
                if (w_file.split('/')[1] === p_uri.path.split('/')[1]) {
                    w_directory.push([w_file.split('/')[2], vscode.FileType.File]);
                }
            }
            return w_directory;

        } else {
            throw vscode.FileSystemError.FileNotFound(p_uri);
        }
    }

    public createDirectory(p_uri: vscode.Uri): void {
        console.warn('DETACHED Called createDirectory with ', p_uri.path); // should not happen
        throw vscode.FileSystemError.NoPermissions();
    }

    public writeFile(p_uri: vscode.Uri, p_content: Uint8Array, p_options: { create: boolean, overwrite: boolean }): void {
        if (this.preventSaveToLeo) {
            this.preventSaveToLeo = false;
        } else {
            void this._leoIntegration.triggerBodySave(true); // Might have been a vscode 'save' via the menu
        }
        const w_gnx = utils.leoUriToStr(p_uri);

        if (!this._openedBodiesInfo[w_gnx]) {
            console.error("LeoJS: Tried to save DETACHED but not in _openedBodiesGnx. gnx :", w_gnx);
        }
        this._setOpenedBodyTime(w_gnx);
        this._openedBodiesInfo[w_gnx].lastBodyLength = p_content.byteLength;
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: p_uri });
    }

    public rename(p_oldUri: vscode.Uri, p_newUri: vscode.Uri, p_options: { overwrite: boolean }): void {
        console.warn('DETACHED Called rename on ', p_oldUri.path, p_newUri.path); // should not happen
        this._fireSoon(
            { type: vscode.FileChangeType.Deleted, uri: p_oldUri },
            { type: vscode.FileChangeType.Created, uri: p_newUri }
        );
    }

    public delete(p_uri: vscode.Uri): void {
        const w_gnx = utils.leoUriToStr(p_uri);
        if (this._openedBodiesInfo[w_gnx]) {
            delete this._openedBodiesInfo[w_gnx];
            delete this.openedBodiesVNodes[w_gnx];
        } else {
            // console.log("not deleted");
        }

        // dirname is just a slash "/"
        let w_dirname = p_uri.with({ path: path.posix.dirname(p_uri.path) });

        this._fireSoon(
            { type: vscode.FileChangeType.Changed, uri: w_dirname },
            { uri: p_uri, type: vscode.FileChangeType.Deleted }
        );
    }

    public copy(p_uri: vscode.Uri): void {
        console.warn('DETACHED Called copy on ', p_uri.path); // should not happen
        throw vscode.FileSystemError.NoPermissions();
    }

    private _fireSoon(...p_events: vscode.FileChangeEvent[]): void {
        this._bufferedEvents.push(...p_events);
        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }
        this._fireSoonHandle = setTimeout(() => {
            this._onDidChangeFileEmitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0; // clearing events array
        }, 5);
    }

}
