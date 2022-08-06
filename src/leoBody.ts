import * as vscode from "vscode";
import * as utils from "./utils";
import * as path from 'path';
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";
import { BodyTimeInfo } from "./types";

/**
 * * Body panes implementation as a file system using "leo" as a scheme identifier
 * Saving and renaming prevents flickering and prevents undos to 'traverse through' different gnx
 */
export class LeoBodyProvider implements vscode.FileSystemProvider {

    // * Flag normally false
    public preventSaveToLeo: boolean = false;
    private _errorRefreshFlag: boolean = false;

    // * Last file read data with the readFile method
    private _lastGnx: string = ""; // gnx of last file read
    private _lastBodyData: string = ""; // body content of last file read
    private _lastBodyLength: number = 0; // length of last file read

    // * List of currently opened body panes gnx (from 'watch' & 'dispose' methods)
    private _watchedBodiesGnx: string[] = [];

    // * List of gnx that should be available (from more.selectNode and fs.delete)
    private _openedBodiesGnx: string[] = [];
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
    public setBodyTime(p_uri: vscode.Uri): void {
        const w_gnx = utils.leoUriToStr(p_uri);
        this._lastBodyTimeGnx = w_gnx;
        if (!this._openedBodiesGnx.includes(w_gnx)) {
            this._openedBodiesGnx.push(w_gnx);
        }
        const w_now = new Date().getTime();
        this._openedBodiesInfo[w_gnx] = {
            ctime: w_now,
            mtime: w_now
        };
    }

    /**
     * * Refresh the body pane for a particular gnx by telling vscode that the file from the Leo file provider has changed
     * @param p_gnx Gnx of body associated with this virtual file, mostly Leo's selected node
     */
    public fireRefreshFile(p_gnx: string): void {
        if (!this._openedBodiesGnx.includes(p_gnx)) {
            console.log("ASKED TO REFRESH NOT EVEN IN SELECTED BODY: ", p_gnx);
            this._openedBodiesGnx.push(p_gnx);
        }
        const w_now = new Date().getTime();
        this._openedBodiesInfo[p_gnx] = {
            ctime: w_now,
            mtime: w_now
        };
        this._onDidChangeFileEmitter.fire([{
            type: vscode.FileChangeType.Changed,
            uri: utils.strToLeoUri(p_gnx)
        } as vscode.FileChangeEvent]);
    }

    /**
     * Maybe deprecated
     * * Refreshes the '_possibleGnxList' list of all unique gnx from Leo
     * @returns a promise that resolves to the fresh gnx string array
     */
    public async refreshPossibleGnxList(): Promise<string[]> {
        // * Get updated list of possible gnx
        const p_result = await this._leoIntegration.sendAction(
            Constants.LEOBRIDGE.GET_ALL_GNX
        );
        this._possibleGnxList = p_result.gnx || [];
        return await Promise.resolve(this._possibleGnxList);
    }

    public watch(p_resource: vscode.Uri): vscode.Disposable {
        const w_gnx = utils.leoUriToStr(p_resource);
        if (!this._watchedBodiesGnx.includes(w_gnx)) {
            this._watchedBodiesGnx.push(w_gnx); // add gnx
        } else {
        }
        return new vscode.Disposable(() => {
            const w_position = this._watchedBodiesGnx.indexOf(w_gnx); // find and remove it
            if (w_position > -1) {
                this._watchedBodiesGnx.splice(w_position, 1);
            }
        });
    }

    public stat(p_uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        // TODO : Fix/Check extraneous stat(...) call(s)
        if (this._leoIntegration.leoStates.fileOpenedReady) {
            const w_gnx = utils.leoUriToStr(p_uri);
            if (p_uri.fsPath.length === 1) { // p_uri.fsPath === '/' || p_uri.fsPath === '\\'
                return { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 };
            } else if (w_gnx === this._lastGnx && this._openedBodiesGnx.includes(this._lastGnx)) {
                return {
                    type: vscode.FileType.File,
                    ctime: this._openedBodiesInfo[this._lastGnx].ctime,
                    mtime: this._openedBodiesInfo[this._lastGnx].mtime,
                    size: this._lastBodyLength
                };
            } else if (this._openedBodiesGnx.includes(w_gnx)) {
                return this._leoIntegration.sendAction(
                    Constants.LEOBRIDGE.GET_BODY_LENGTH,
                    JSON.stringify({ "gnx": w_gnx })
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
                // if (!this._possibleGnxList.includes(w_gnx)) {
                if (!this._openedBodiesGnx.includes(w_gnx)) {
                    console.log(
                        " _openedBodiesGnx length: ", this._openedBodiesGnx.length,
                        '\n *** readFile: ERROR File not in _openedBodiesGnx! readFile missing refreshes? gnx: ', w_gnx
                    );
                    // throw vscode.FileSystemError.FileNotFound();
                    // (Instead of FileNotFound) should be caught by _onActiveEditorChanged or _changedVisibleTextEditors
                    /*
                    if (!this._errorRefreshFlag) {
                        this._tryFullRefresh();
                    }
                    return Promise.resolve(Buffer.from(""));
                     */

                    // TODO : CLeanup this code duplication experiment!

                    const p_result = await this._leoIntegration.sendAction(
                        Constants.LEOBRIDGE.GET_BODY,
                        JSON.stringify({ "gnx": w_gnx })
                    );
                    if (p_result.body) {
                        this._errorRefreshFlag = false; // got body so reset possible flag!
                        this._lastGnx = w_gnx;
                        this._lastBodyData = p_result.body;
                        const w_buffer: Uint8Array = Buffer.from(p_result.body);
                        this._lastBodyLength = w_buffer.byteLength;
                        return Promise.resolve(w_buffer);
                    } else if (p_result.body === "") {
                        this._lastGnx = w_gnx;
                        this._lastBodyLength = 0;
                        this._lastBodyData = "";
                        return Promise.resolve(Buffer.from(""));
                    } else {
                        if (!this._errorRefreshFlag) {
                            // this._tryFullRefresh();
                            this._leoIntegration.fullRefresh();
                        }
                        if (this._lastGnx === w_gnx) {
                            // was last gnx of closed file about to be switched to new document selected
                            console.log('Passed in not found: ' + w_gnx);
                            return Promise.resolve(Buffer.from(this._lastBodyData));
                        }
                        console.error("ERROR => readFile of unknown GNX"); // is possibleGnxList updated correctly?


                        //  throw vscode.FileSystemError.FileNotFound();
                        // (Instead of FileNotFound) should be caught by _onActiveEditorChanged or _changedVisibleTextEditors
                        return Promise.resolve(Buffer.from(""));
                    }
                } else {

                    const p_result_1 = await this._leoIntegration.sendAction(
                        Constants.LEOBRIDGE.GET_BODY,
                        JSON.stringify({ "gnx": w_gnx })
                    );
                    if (p_result_1.body) {
                        console.log('back from read gnx: ', w_gnx, '   - read ok has body');

                        this._errorRefreshFlag = false; // got body so reset possible flag!
                        this._lastGnx = w_gnx;
                        this._lastBodyData = p_result_1.body;
                        const w_buffer_1: Uint8Array = Buffer.from(p_result_1.body);
                        this._lastBodyLength = w_buffer_1.byteLength;
                        return Promise.resolve(w_buffer_1);
                    } else if (p_result_1.body === "") {
                        console.log('back from read gnx: ', w_gnx, '  - read ok has empty body');

                        this._lastGnx = w_gnx;
                        this._lastBodyLength = 0;
                        this._lastBodyData = "";
                        return Promise.resolve(Buffer.from(""));
                    } else {
                        if (!this._errorRefreshFlag) {
                            this._leoIntegration.fullRefresh();
                        }
                        if (this._lastGnx === w_gnx) {
                            // was last gnx of closed file about to be switched to new document selected
                            console.log('Passed in not found: ' + w_gnx);
                            return Promise.resolve(Buffer.from(this._lastBodyData));
                        }
                        console.error("ERROR => readFile of unknown GNX"); // is possibleGnxList updated correctly?


                        //  throw vscode.FileSystemError.FileNotFound();
                        // (Instead of FileNotFound) should be caught by _onActiveEditorChanged or _changedVisibleTextEditors
                        return Promise.resolve(Buffer.from(""));
                    }
                }
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
        if (!this._openedBodiesGnx.includes(w_gnx)) {
            console.error("Leointeg: Tried to save body other than selected node's body", w_gnx);
            this._openedBodiesGnx.push(w_gnx);
        }
        const w_now = new Date().getTime();
        this._openedBodiesInfo[w_gnx] = {
            ctime: w_now,
            mtime: w_now
        };
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
        console.log("delete", p_uri.fsPath);
        const w_gnx = utils.leoUriToStr(p_uri);
        if (this._openedBodiesGnx.includes(w_gnx)) {
            this._openedBodiesGnx.splice(this._openedBodiesGnx.indexOf(w_gnx), 1);
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
