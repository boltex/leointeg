import * as vscode from "vscode";
import * as utils from "./utils";
import * as path from 'path';
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";
import { BodyTimeInfo } from "./types";

/**
 * * Body panes implementation as a file system using "leo" as a scheme identifier
 */
export class LeoBodyProvider implements vscode.FileSystemProvider {

    // * Flag normally false
    public preventSaveToLeo: boolean = false;

    // * Last file read data with the readFile method
    public lastGnx: string = ""; // gnx of last file read
    public lastBodyData: string = ""; // body content of last file read
    public lastBodyLength: number = 0; // length of last file read

    // * List of currently opened body panes gnx (from 'watch' & 'dispose' methods)
    public watchedBodiesGnx: string[] = [];

    // * List of gnx open in tab(s) (from tryApplyNodeToBody / switchBody and fs.delete)
    private _openedBodiesInfo: { [key: string]: BodyTimeInfo } = {};

    // * List of all possible vNodes gnx in the currently opened leo file (since last refresh/tree operation)
    private _possibleGnxList: string[] = []; // Maybe deprecated

    private _lastBodyTimeGnx: string = "";

    // * An event to signal that a resource has been changed
    // * It should fire for resources that are being [watched](#FileSystemProvider.watch) by clients of this provider
    private _onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFileEmitter.event;
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    constructor(private _leoIntegration: LeoIntegration) { }

    /**
     * * Sets selected node body's modified time for this gnx virtual file
     * @param p_uri URI of file for which to set made-up modified time
     */
    public setNewBodyUriTime(p_uri: vscode.Uri): void {
        const w_gnx = utils.leoUriToStr(p_uri);
        this._lastBodyTimeGnx = w_gnx;
        this._setOpenedBodyTime(w_gnx);
    }

    /**
     * Set data from detached body with same commander & gnx
     */
    public setFromDetached(p_data: string, p_gnx: string): void {
        this._lastBodyTimeGnx = p_gnx;
        this._setOpenedBodyTime(p_gnx);
        this.lastGnx = p_gnx;
        this.lastBodyData = p_data;
        const w_buffer = Buffer.from(p_data);
        this.lastBodyLength = w_buffer.byteLength;
    }

    /**
     * * Adds entries in openedBodiesGnx and _openedBodiesInfo if needed
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
            mtime: w_now // new 'modified' time for sure.
        };
    }

    public cleanupBodies(): void {
        const w_foundGnx: string[] = [];
        vscode.window.tabGroups.all.forEach((p_tabGroup) => {
            p_tabGroup.tabs.forEach((p_tab) => {
                if (p_tab.input &&
                    (p_tab.input as vscode.TabInputText).uri &&
                    (p_tab.input as vscode.TabInputText).uri.scheme === Constants.URI_LEO_SCHEME
                ) {
                    w_foundGnx.push(utils.leoUriToStr((p_tab.input as vscode.TabInputText).uri));
                }
            });
        });
        if (!w_foundGnx.length) {
            return;
        }
        for (const openBody of Object.keys(this._openedBodiesInfo)) {
            if (!w_foundGnx.includes(openBody)) {
                // Not an opened tab! remove it!

                delete this._openedBodiesInfo[openBody];
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
            return; // Document is not being watched (closed tab or non-visible non-dirty tab)
        }
        this._onDidChangeFileEmitter.fire([{
            type: vscode.FileChangeType.Changed,
            uri: utils.strToLeoUri(p_gnx)
        } as vscode.FileChangeEvent]);
    }

    public watch(p_resource: vscode.Uri): vscode.Disposable {
        const w_gnx = utils.leoUriToStr(p_resource);
        if (!this.watchedBodiesGnx.includes(w_gnx)) {
            this.watchedBodiesGnx.push(w_gnx); // add gnx
        } else {
        }
        return new vscode.Disposable(() => {
            const w_position = this.watchedBodiesGnx.indexOf(w_gnx); // find and remove it
            if (w_position > -1) {
                this.watchedBodiesGnx.splice(w_position, 1);
            }
        });
    }

    public stat(p_uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        if (this._leoIntegration.leoStates.fileOpenedReady) {
            const w_gnx = utils.leoUriToStr(p_uri);
            if (p_uri.fsPath.length === 1) { // p_uri.fsPath === '/' || p_uri.fsPath === '\\'
                return { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 };
            } else if (w_gnx === this.lastGnx && this._openedBodiesInfo[this.lastGnx]) {
                return {
                    type: vscode.FileType.File,
                    ctime: this._openedBodiesInfo[this.lastGnx].ctime,
                    mtime: this._openedBodiesInfo[this.lastGnx].mtime,
                    size: this.lastBodyLength
                };
            } else if (this._openedBodiesInfo[w_gnx]) {
                return this._leoIntegration.sendAction(
                    Constants.LEOBRIDGE.GET_BODY_LENGTH,
                    { "gnx": w_gnx }
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
            }
        }
        // throw vscode.FileSystemError.FileNotFound();
        // (Instead of FileNotFound) should be caught by _onActiveEditorChanged or _changedVisibleTextEditors
        return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: 0 };
    }

    public async readFile(p_uri: vscode.Uri): Promise<Uint8Array> {
        if (this._leoIntegration.leoStates.fileOpenedReady) {
            if (p_uri.fsPath.length === 1) { // p_uri.fsPath === '/' || p_uri.fsPath === '\\'
                throw vscode.FileSystemError.FileIsADirectory(p_uri);
            } else {
                const w_gnx = utils.leoUriToStr(p_uri);

                if (!this._openedBodiesInfo[w_gnx]) {
                    console.warn('readFile: ERROR File not in _openedBodiesInfo! gnx: ', w_gnx);
                }
                let w_buffer: Uint8Array;


                if (this._leoIntegration.changedDetachedWithMirrorBody && this.lastBodyData && w_gnx === this.lastGnx) {
                    console.log("test", this._leoIntegration.changedDetachedWithMirrorBody, " and ", w_gnx);

                    w_buffer = Buffer.from(this.lastBodyData);

                }


                // * GET FROM SERVER
                const p_result = await this._leoIntegration.sendAction(
                    Constants.LEOBRIDGE.GET_BODY,
                    { "gnx": w_gnx }
                );

                if (p_result.body) {
                    // console.log('back from read gnx: ', w_gnx, '   - read ok has body');

                    if (this.lastGnx === w_gnx && this.lastBodyData === p_result.body) {
                        // If EXACT SAME body has refreshed, clear prevent preventIconChange
                        // (because _onDocumentChanged will not be triggered)
                        // Otherwise, changing a character wont change the icon, until the next change.
                        this._leoIntegration.preventIconChange = false;
                    }

                    this.lastGnx = w_gnx;
                    this.lastBodyData = p_result.body;
                    w_buffer = Buffer.from(p_result.body);
                    this.lastBodyLength = w_buffer.byteLength;

                } else if (p_result.body === "") {
                    // console.log('back from read gnx: ', w_gnx, '  - read ok has empty body');

                    this.lastGnx = w_gnx;
                    this.lastBodyLength = 0;
                    this.lastBodyData = "";
                    w_buffer = Buffer.from("");
                } else {
                    this._leoIntegration.fullRefresh();
                    if (this.lastGnx === w_gnx) {
                        // was last gnx of closed file about to be switched to new document selected
                        w_buffer = Buffer.from(this.lastBodyData);
                    } else {
                        console.error("ERROR => readFile of unknown GNX"); // is possibleGnxList updated correctly?
                        //  throw vscode.FileSystemError.FileNotFound();
                        // (Instead of FileNotFound) should be caught by _onActiveEditorChanged or _changedVisibleTextEditors
                        w_buffer = Buffer.from("");
                    }
                }

                return w_buffer;
            }
        } else {
            throw vscode.FileSystemError.FileNotFound(p_uri);
        }
    }

    public readDirectory(p_uri: vscode.Uri): Thenable<[string, vscode.FileType][]> {
        if (p_uri.fsPath.length === 1) { // p_uri.fsPath === '/' || p_uri.fsPath === '\\'
            const w_directory: [string, vscode.FileType][] = [];
            w_directory.push([this._lastBodyTimeGnx, vscode.FileType.File]);
            return Promise.resolve(w_directory);
        } else {
            throw vscode.FileSystemError.FileNotFound(p_uri);
        }
    }

    public createDirectory(p_uri: vscode.Uri): void {
        console.warn('Called createDirectory with ', p_uri.fsPath); // should not happen
        throw vscode.FileSystemError.NoPermissions(p_uri);
    }

    public writeFile(p_uri: vscode.Uri, p_content: Uint8Array, p_options: { create: boolean, overwrite: boolean }): void {
        if (!this.preventSaveToLeo) {
            this._leoIntegration.triggerBodySave(true); // Might have been a vscode 'save' via the menu
        } else {
            this.preventSaveToLeo = false;
        }
        const w_gnx = utils.leoUriToStr(p_uri);
        if (!this._openedBodiesInfo[w_gnx]) {
            console.error("Leointeg: Tried to save body other than selected node's body", w_gnx);
        }
        this._setOpenedBodyTime(w_gnx);
        if (w_gnx === this.lastGnx) {
            this.lastBodyLength = p_content.byteLength;
        }
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: p_uri });
    }

    public rename(p_oldUri: vscode.Uri, p_newUri: vscode.Uri, p_options: { overwrite: boolean }): void {
        console.warn('Called rename on ', p_oldUri.fsPath, p_newUri.fsPath); // should not happen
        this._fireSoon(
            { type: vscode.FileChangeType.Deleted, uri: p_oldUri },
            { type: vscode.FileChangeType.Created, uri: p_newUri }
        );
    }

    public delete(p_uri: vscode.Uri): void {

        const w_gnx = utils.leoUriToStr(p_uri);
        if (this._openedBodiesInfo[w_gnx]) {
            delete this._openedBodiesInfo[w_gnx];
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
        console.warn('Called copy on ', p_uri.fsPath); // should not happen
        throw vscode.FileSystemError.NoPermissions(p_uri);
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
