import * as vscode from "vscode";
import * as utils from "./utils";
import * as path from 'path';
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";
import { BodyTimeInfo } from "./types";

export class LeoBodyProvider implements vscode.FileSystemProvider {
    // * Body panes implemented as a file system with this FileSystemProvider implementation (using "leo" as a scheme identifier)
    // * Note: Saving and renaming prevents flickering and prevents undos to 'traverse through' different gnx

    // * Simple structure to keep mtime of selected and renamed body virtual files
    private _selectedBody: BodyTimeInfo = { gnx: "", ctime: 0, mtime: 0 };
    private _renameBody: BodyTimeInfo = { gnx: "", ctime: 0, mtime: 0 };

    // * Last file read data with the readFile method
    private _lastGnx: string = ""; // gnx of last file read
    private _lastGnxBodyLength: number = 0; // length of last file read

    // * List of currently opened body panes gnx (from 'watch' & 'dispose' methods)
    private _openedBodiesGnx: string[] = [];

    // * List of all possible vNodes gnx in the currently opened leo file (since last refresh/tree operation)
    private _possibleGnxList: string[] = [];

    // * An event to signal that a resource has been changed
    // * It should fire for resources that are being [watched](#FileSystemProvider.watch) by clients of this provider
    private _onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFileEmitter.event;

    constructor(private _leoIntegration: LeoIntegration) { }

    /**
     * * Sets selected node body's modified time for this gnx virtual file
     * @param p_uri URI of file for which to set made-up modified time
     */
    public setBodyTime(p_uri: vscode.Uri): void {
        const w_gnx = utils.uriToStr(p_uri);
        this._selectedBody = {
            gnx: w_gnx,
            ctime: 0,
            mtime: (w_gnx === this._renameBody.gnx && this._selectedBody.gnx === this._renameBody.gnx) ? this._renameBody.mtime : Date.now(),
        };
    }

    /**
     * * Sets renamed file modified time for this gnx, used for 'rename' hack to prevent text undos between gnx
     * @param p_uri URI of file for which to set made-up modified time
     */
    public setRenameTime(p_gnx: string): void {
        this._renameBody = {
            gnx: p_gnx,
            ctime: 0,
            mtime: Date.now(),
        };
    }

    /**
     * * Refresh the body pane for a particular gnx by telling vscode that the file from the Leo file provider has changed
     * @param p_gnx Gnx of body associated with this virtual file, mostly Leo's selected node
     */
    public fireRefreshFile(p_gnx: string): void {
        this._selectedBody = {
            gnx: p_gnx,
            ctime: 0,
            mtime: Date.now(),
        };
        this._onDidChangeFileEmitter.fire([{
            type: vscode.FileChangeType.Changed,
            uri: utils.strToUri(p_gnx)
        } as vscode.FileChangeEvent]);
    }

    /**
     * * Refreshes the '_possibleGnxList' list of all unique gnx from Leo
     * @returns a promise that resolves to the fresh gnx string array
     */
    public refreshPossibleGnxList(): Thenable<string[]> {
        // * Get updated list of possible gnx
        return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_ALL_GNX).then((p_result) => {
            if (p_result.allGnx) {
                this._possibleGnxList = p_result.allGnx;
            } else {
                this._possibleGnxList = [];
            }
            return Promise.resolve(this._possibleGnxList);
        });
    }

    /**
     * * Get list of bodies that should be closed: gnx from openedBodiesGnx that are not in possibleGnxList
     * @returns Promise that resolves in a string array
     */
    public getExpiredGnxList(): Thenable<string[]> {
        return this.refreshPossibleGnxList()
            .then(p_possibleGnxList => {
                const w_gnxToClose: string[] = [];
                this._openedBodiesGnx.forEach(p_openedGnx => {
                    if (!p_possibleGnxList.includes(p_openedGnx)) {
                        w_gnxToClose.push(p_openedGnx);
                    }
                });
                this.fireDeleteExpiredGnx(w_gnxToClose);
                return Promise.resolve(w_gnxToClose);
            });
    }

    public watch(p_resource: vscode.Uri): vscode.Disposable {
        const w_gnx = utils.uriToStr(p_resource);
        if (!this._openedBodiesGnx.includes(w_gnx)) {
            this._openedBodiesGnx.push(w_gnx); // add gnx
        }
        return new vscode.Disposable(() => {
            const w_position = this._openedBodiesGnx.indexOf(w_gnx); // find and remove it
            if (w_position > -1) {
                this._openedBodiesGnx.splice(w_position, 1);
            }
        });
    }

    public fireDeleteExpiredGnx(p_gnxList: string[]): void {
        p_gnxList.forEach(p_gnx => {
            const w_uri: vscode.Uri = utils.strToUri(p_gnx);
            this._fireSoon({ uri: w_uri, type: vscode.FileChangeType.Deleted });
        });
    }

    public stat(p_uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        // TODO : Fix extraneous stat(...) call(s)
        if (this._leoIntegration.fileOpenedReady) {
            if (p_uri.fsPath === '/' || p_uri.fsPath === '\\') {
                // console.log('called stat on root');
                return { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 };
            } else if (p_uri.fsPath === '/' + this._lastGnx || (p_uri.fsPath === '\\' + this._lastGnx)) {
                // Watchout for backslash vs slash in different OSes
                // If same as last checked, sending back time at absolute past
                return {
                    type: vscode.FileType.File,
                    ctime: 0,
                    mtime: 0, // this._selectedBody.mtime, // IF this._selectedBody.mtime we get file changed on disk error!!
                    size: this._lastGnxBodyLength
                };
            } else {
                const w_gnx = utils.uriToStr(p_uri);
                if (this._selectedBody.gnx !== w_gnx && this._renameBody.gnx !== w_gnx) {
                    console.log('ERROR File not in list selected: ' + this._selectedBody.gnx + " renamed: " + this._renameBody.gnx + " stat asked on w_gnx: " + w_gnx);
                    throw vscode.FileSystemError.FileNotFound();
                } else {
                    return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_BODY_LENGTH, '"' + w_gnx + '"')
                        .then((p_result) => {
                            let w_mtime: number = 0;
                            if (this._renameBody.gnx === w_gnx) {
                                w_mtime = this._renameBody.mtime;
                            } else {
                                w_mtime = this._selectedBody.mtime;
                            }
                            return Promise.resolve(
                                {
                                    type: vscode.FileType.File,
                                    ctime: 0,
                                    mtime: w_mtime,
                                    size: p_result.bodyLength ? p_result.bodyLength : 0 // this.leoIntegration.bodyText.length
                                }
                            );
                        });
                }
            }
        } else {
            throw vscode.FileSystemError.FileNotFound(); // console.log("not ready");
        }
    }

    public readFile(p_uri: vscode.Uri): Thenable<Uint8Array> {
        if (this._leoIntegration.fileOpenedReady) {
            if (p_uri.fsPath === '/' || p_uri.fsPath === '\\') {
                throw vscode.FileSystemError.FileIsADirectory();
            } else {
                const w_gnx = utils.uriToStr(p_uri);
                // if (!this._possibleGnxList.includes(w_gnx)) {
                if (this._selectedBody.gnx !== w_gnx && this._renameBody.gnx !== w_gnx) {
                    console.error("readFile: ERROR File not in list! readFile missing refreshes?");
                    throw vscode.FileSystemError.FileNotFound();
                } else {
                    return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_BODY, '"' + w_gnx + '"')
                        .then((p_result) => {
                            this._lastGnx = w_gnx;
                            if (p_result.bodyData) {
                                this._lastGnxBodyLength = p_result.bodyData.length;
                                return Promise.resolve(Buffer.from(p_result.bodyData));
                            } else if (p_result.bodyData === "") {
                                this._lastGnxBodyLength = 0;
                                return Promise.resolve(Buffer.from(""));
                            } else {
                                console.error("ERROR => readFile of unknown GNX"); // is possibleGnxList updated correctly?
                                throw vscode.FileSystemError.FileNotFound();
                            }
                        });
                }
            }
        } else {
            throw vscode.FileSystemError.FileNotFound();
        }
    }

    public readDirectory(p_uri: vscode.Uri): Thenable<[string, vscode.FileType][]> {
        if (p_uri.fsPath === '/' || p_uri.fsPath === '\\') {
            const w_directory: [string, vscode.FileType][] = [];
            w_directory.push([this._selectedBody.gnx, vscode.FileType.File]);
            return Promise.resolve(w_directory);
        } else {
            throw vscode.FileSystemError.FileNotFound();
        }
    }

    public createDirectory(p_uri: vscode.Uri): void {
        console.warn('Called createDirectory with ', p_uri.fsPath); // should not happen
        throw vscode.FileSystemError.NoPermissions();
    }

    public writeFile(p_uri: vscode.Uri, p_content: Uint8Array, p_options: { create: boolean, overwrite: boolean }): void {
        this._leoIntegration.checkWriteFile();
        const w_gnx = utils.uriToStr(p_uri);
        const w_now = Date.now();
        if (this._selectedBody.gnx === w_gnx) {
            this._selectedBody.mtime = w_now;
        }
        if (this._renameBody.gnx === w_gnx) {
            this._renameBody.mtime = w_now;
        }
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: p_uri });
    }

    public rename(p_oldUri: vscode.Uri, p_newUri: vscode.Uri, p_options: { overwrite: boolean }): void {
        const w_gnx = utils.uriToStr(p_newUri);
        if (this._selectedBody.gnx === w_gnx) {
            this._selectedBody.mtime = Date.now();
        }
        if (this._renameBody.gnx === w_gnx) {
            this._renameBody.mtime = Date.now();
        }
        this._fireSoon(
            { type: vscode.FileChangeType.Deleted, uri: p_oldUri },
            { type: vscode.FileChangeType.Created, uri: p_newUri }
        );
    }

    public delete(uri: vscode.Uri): void {
        let w_dirname = uri.with({ path: path.posix.dirname(uri.path) }); // dirname is just a slash "/"
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: w_dirname }, { uri, type: vscode.FileChangeType.Deleted });
    }

    public copy(p_uri: vscode.Uri): void {
        console.warn('Called copy on ', p_uri.fsPath); // should not happen
        throw vscode.FileSystemError.NoPermissions();
    }

    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    private _fireSoon(...p_events: vscode.FileChangeEvent[]): void {
        this._bufferedEvents.push(...p_events);
        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }
        this._fireSoonHandle = setTimeout(() => {
            this._emitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0; // clearing events array
        }, 5);
    }
}