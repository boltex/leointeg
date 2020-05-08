import * as vscode from "vscode";
import * as utils from "./utils";
import * as path from 'path';
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";

export class LeoBodyProvider implements vscode.FileSystemProvider {
    // * Body panes implemented as a file system with this FileSystemProvider implementation (using "leo" as a scheme identifier)
    // * Note: Saving and renaming prevents flickering and prevents undos to 'traverse through' nodes

    // TEST STRUCTURE to keep mtime of selected body
    // TODO : Maybe revise structure if only going to be "LEO BODY" with or without decorator
    private _selectedBody: {
        gnx: string;
        ctime: number;
        mtime: number;
    };

    // TEST STRUCTURE  renamed body will become selected body in rename-save hack to prevent undo/redos
    // TODO : Maybe revise structure if only going to be "LEO BODY" with or without decorator
    private _renameBody: {
        gnx: string;
        ctime: number;
        mtime: number;
    };

    // * Last file read data with the readFile method
    private _lastGnx: string = ""; // gnx of last file read
    private _lastGnxBodyLength: number = 0; // length of last file read

    // * list of currently opened body panes gnx (from 'watch' & 'dispose' methods)
    private _openedBodiesGnx: string[] = [];

    // * list of all possible vNodes gnx in the currently opened leo file (since last refresh/tree operation)
    private _possibleGnxList: string[] = [];

    // * An event to signal that a resource has been changed
    // * It should fire for resources that are being [watched](#FileSystemProvider.watch) by clients of this provider
    private _onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFileEmitter.event;

    constructor(private _leoIntegration: LeoIntegration) {
        // TEST STRUCTURES
        this._selectedBody = {
            gnx: "",
            ctime: 0,
            mtime: 0
        };
        this._renameBody = {
            gnx: "",
            ctime: 0,
            mtime: 0
        };
    }

    public setBodyTime(p_uri: vscode.Uri): void {

        // TODO : Maybe revise structure if only going to be "LEO BODY" with or without decorator

        // save selected gnx and set its mtime to 'now'

        //console.log('called setBodyUri for gnx: ', utils.uriToGnx(p_uri));

        // if (this._renameBody.gnx && this._selectedBody.gnx === this._renameBody.gnx) {
        //     console.log('set to rename time', this._renameBody.mtime);
        // }
        const w_gnx = utils.uriToStr(p_uri);
        this._selectedBody = {
            gnx: w_gnx,
            ctime: 0,
            mtime: (w_gnx === this._renameBody.gnx && this._selectedBody.gnx === this._renameBody.gnx) ? this._renameBody.mtime : Date.now(),
        };
        // console.log('finished setBodyUri, time st to', this._selectedBody.mtime);

    }

    public setRenameTime(p_gnx: string): void {
        // TODO : Maybe revise structure if only going to be "LEO BODY" with or without decorator

        // Need to keep track of it separately from regular bodyUri because of save-rename hack

        // console.log('called setRenameGnx for gnx: ', p_gnx);
        this._renameBody = {
            gnx: p_gnx,
            ctime: 0,
            mtime: Date.now(),
        };
        // console.log('finished setRenameGnx, time st to', this._renameBody.mtime);
    }

    public fireRefreshFile(p_gnx: string): void {

        console.log('FIRING REFRESH on ', p_gnx);

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

    public fireRefreshFiles(): void {
        // _openedBodiesGnx is from 'watch' & 'dispose' methods
        this._openedBodiesGnx.forEach(p_bodyGnx => {
            this.fireRefreshFile(p_bodyGnx);
        });
    }

    public addGnx(p_gnx: string): void {
        this._possibleGnxList.push(p_gnx);
    }

    public isGnxValid(p_gnx: string): boolean {
        if (this._possibleGnxList.includes(p_gnx)) {
            return true;
        } else {
            return false;
        }
    }

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

    public getExpiredGnxList(): Thenable<string[]> {
        // * Get list of bodies that should be closed: gnx from openedBodiesGnx that are not in possibleGnxList
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

    public getRemainingWatchedGnxList(): Thenable<string[]> {
        // TODO : Maybe unneeded if only going to be "LEO BODY" with or without decorator

        const w_remaining: string[] = [];
        this._possibleGnxList.forEach(p_openedGnx => {
            if (this._openedBodiesGnx.includes(p_openedGnx)) {
                w_remaining.push(p_openedGnx);
            }
        });
        return Promise.resolve(w_remaining);
    }

    public watch(p_resource: vscode.Uri): vscode.Disposable {

        // TODO : Probably just replace with dummy function if only going to be

        console.log('Watch ', p_resource.fsPath);

        const w_gnx = utils.uriToStr(p_resource);
        if (!this._openedBodiesGnx.includes(w_gnx)) {
            this._openedBodiesGnx.push(w_gnx); // add gnx
        }
        return new vscode.Disposable(() => {
            console.log('Dispose of Watch ', w_gnx);

            const w_position = this._openedBodiesGnx.indexOf(w_gnx); // find and remove it
            if (w_position > -1) {
                this._openedBodiesGnx.splice(w_position, 1);
            }
        });
    }

    public fireDeleteExpiredGnx(p_gnxList: string[]): void {
        // console.log('fireDeletedEvent for total # of gnx: ', p_gnxList.length);
        p_gnxList.forEach(p_gnx => {
            const w_uri: vscode.Uri = utils.strToUri(p_gnx);
            this._fireSoon({ uri: w_uri, type: vscode.FileChangeType.Deleted });
        });
    }

    public stat(p_uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {

        // TODO : Call with uri for either "LEO BODY" with or without decorator to fake name change

        console.log('Called stat on', p_uri.fsPath);

        if (this._leoIntegration.fileOpenedReady) {
            if (p_uri.fsPath === '/') {
                console.log('called stat on root : "/" ! ');
                return { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 };
            } else if (p_uri.fsPath === '/' + this._lastGnx) {
                return {
                    type: vscode.FileType.File,
                    ctime: 0,
                    mtime: 0, // this._selectedBody.mtime, // IF this._selectedBody.mtime we get file changed on disk error!!
                    size: this._lastGnxBodyLength
                };
            } else {
                const w_gnx = utils.uriToStr(p_uri);
                if (this._selectedBody.gnx !== w_gnx && this._renameBody.gnx !== w_gnx) {
                    console.log("stat: hey! Not in list! stat missing refreshes??");
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
                            console.log('stat given with mtime', w_mtime);

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

        // TODO : Call with uri for either "LEO BODY" with or without decorator to fake name change

        console.log('Called readFile on', p_uri.fsPath);

        if (this._leoIntegration.fileOpenedReady) {
            if (p_uri.fsPath === '/') {
                throw vscode.FileSystemError.FileIsADirectory();
            } else {
                const w_gnx = utils.uriToStr(p_uri);
                // if (!this._possibleGnxList.includes(w_gnx)) {
                if (this._selectedBody.gnx !== w_gnx && this._renameBody.gnx !== w_gnx) {
                    console.log("readFile: hey! Not in list! readFile missing refreshes??");
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

        // TODO : Output relevant "LEO BODY" with or without decorator to fake name change

        if (p_uri.fsPath === '/') {
            const w_directory: [string, vscode.FileType][] = [];
            w_directory.push([this._selectedBody.gnx, vscode.FileType.File]);
            return Promise.resolve(w_directory);
        } else {
            throw vscode.FileSystemError.FileNotFound();
        }
    }

    public createDirectory(p_uri: vscode.Uri): void {
        console.log('called createDirectory with ', p_uri.fsPath); // should not happen
        throw vscode.FileSystemError.NoPermissions();
    }

    public writeFile(p_uri: vscode.Uri, p_content: Uint8Array, p_options: { create: boolean, overwrite: boolean }): void {

        // TODO : Convert uri "LEO BODY" with or without decorator into its GNX for server script to fetch

        console.log('called writeFile!', p_uri.fsPath);
        this._leoIntegration.checkWriteFile();
        const w_gnx = utils.uriToStr(p_uri);
        // if (!this._possibleGnxList.includes(w_gnx)) {
        if (this._selectedBody.gnx === w_gnx) {
            this._selectedBody.mtime = Date.now();
        }
        if (this._renameBody.gnx === w_gnx) {
            this._renameBody.mtime = Date.now();
        }
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: p_uri });

    }

    public rename(p_oldUri: vscode.Uri, p_newUri: vscode.Uri, p_options: { overwrite: boolean }): void {

        // TODO : Should be just rename from a uri to the next but instead use "LEO BODY" with or without decorator

        if (p_options) {
            console.log('rename had options: ', p_options); // placeholder
        }

        console.log('called rename', p_oldUri.fsPath, p_newUri.fsPath);
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

        // throw vscode.FileSystemError.NoPermissions();
    }

    public delete(uri: vscode.Uri): void {
        console.log('called delete ', uri.fsPath);

        let dirname = uri.with({ path: path.posix.dirname(uri.path) });
        console.log('dirname ', dirname.fsPath);

        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { uri, type: vscode.FileChangeType.Deleted });

        // throw vscode.FileSystemError.NoPermissions();
    }

    public copy(p_uri: vscode.Uri): void {
        console.log('called copy on ', p_uri.fsPath); // should not happen
        throw vscode.FileSystemError.NoPermissions();
    }

    // TODO : revise / manage file events.

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
            // console.log('firing # of events :', this._bufferedEvents.length);
            this._bufferedEvents.length = 0; // clearing events array
        }, 5);
    }
}