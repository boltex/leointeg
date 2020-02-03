import * as vscode from "vscode";
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";

export class LeoBodyProvider implements vscode.FileSystemProvider {
    // * Body panes implemented as a file system with this FileSystemProvider implementation (using "leo" as a scheme identifier)

    // ! Saving and renaming prevents flickering and prevents undos to 'traverse through' nodes, see leoIntegration.ts

    // * Last file read data with the readFile method
    private _lastGnx = ""; // gnx of last file read
    private _lastGnxBodyLength = 0; // length of last file read

    // * list of currently opened body panes gnx (from 'watch' & 'dispose' methods)
    public openedBodiesGnx: string[] = [];
    // * list of all possible vNodes gnx in the currently opened leo file (since last refresh/tree operation)
    public possibleGnxList: string[] = [];

    // * An event to signal that a resource has been changed
    // * It should fire for resources that are being [watched](#FileSystemProvider.watch) by clients of this provider
    private _onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFileEmitter.event;

    constructor(private leoIntegration: LeoIntegration) { }

    public fireRefreshFiles(): void {
        this.openedBodiesGnx.forEach(p_bodyGnx => {
            // console.log('refresh body:', p_bodyGnx);
            this._onDidChangeFileEmitter.fire([{
                type: vscode.FileChangeType.Changed,
                uri: vscode.Uri.parse(Constants.URI_SCHEME_HEADER + p_bodyGnx)
            } as vscode.FileChangeEvent]);
        });
    }

    public addGnx(p_gnx: string): void {
        this.possibleGnxList.push(p_gnx);
    }

    public gnxValid(p_gnx: string): boolean {
        if (this.possibleGnxList.includes(p_gnx)) {
            return true;
        } else {
            return false;
        }
    }

    public refreshPossibleGnxList(): Thenable<string[]> {
        // * Get updated list of possible gnx
        return this.leoIntegration.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.GET_ALL_GNX).then((p_result) => {
            if (p_result.allGnx) {
                this.possibleGnxList = p_result.allGnx;
            } else {
                this.possibleGnxList = [];
            }
            return Promise.resolve(this.possibleGnxList);
        });
    }

    public getExpiredGnxList(): Thenable<string[]> {
        // * Get list of bodies that should be closed: gnx from openedBodiesGnx that are not in possibleGnxList
        return this.refreshPossibleGnxList()
            .then(p_possibleGnxList => {
                const w_gnxToClose: string[] = [];
                this.openedBodiesGnx.forEach(p_openedGnx => {
                    if (!p_possibleGnxList.includes(p_openedGnx)) {
                        w_gnxToClose.push(p_openedGnx);
                    }
                });
                this.fireDeleteExpiredGnx(w_gnxToClose);
                return Promise.resolve(w_gnxToClose);
            });
    }

    public getRemainingWatchedGnxList(): Thenable<string[]> {
        const w_remaining: string[] = [];
        this.possibleGnxList.forEach(p_openedGnx => {
            if (this.openedBodiesGnx.includes(p_openedGnx)) {
                w_remaining.push(p_openedGnx);
            }
        });
        return Promise.resolve(w_remaining);
    }

    public watch(p_resource: vscode.Uri): vscode.Disposable {
        if (!this.openedBodiesGnx.includes(p_resource.fsPath.substr(1))) {
            this.openedBodiesGnx.push(p_resource.fsPath.substr(1)); // add gnx
        }
        return new vscode.Disposable(() => {
            const w_position = this.openedBodiesGnx.indexOf(p_resource.fsPath.substr(1)); // find and remove it
            if (w_position > -1) {
                this.openedBodiesGnx.splice(w_position, 1);
            }
        });
    }

    public fireDeleteExpiredGnx(p_gnxList: string[]): void {
        // console.log('fireDeletedEvent for total # of gnx: ', p_gnxList.length);
        p_gnxList.forEach(p_gnx => {
            const w_uri: vscode.Uri = vscode.Uri.parse(Constants.URI_SCHEME_HEADER + p_gnx);
            this._fireSoon({ uri: w_uri, type: vscode.FileChangeType.Deleted });
        });
    }

    public stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        if (this.leoIntegration.fileOpenedReady) {
            if (uri.fsPath === '/') {
                console.log('called stat on root : "/" ! ');
                return { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 };
            } else if (uri.fsPath === '/' + this._lastGnx) {
                return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: this._lastGnxBodyLength };
            } else {
                const w_gnx = uri.fsPath.substr(1);
                if (!this.possibleGnxList.includes(w_gnx)) {
                    // console.log("hey! Not in list! stat missing refreshes??");
                    throw vscode.FileSystemError.FileNotFound();
                } else {
                    return this.leoIntegration.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.GET_BODY_LENGTH, '"' + w_gnx + '"')
                        .then((p_result) => {
                            if (p_result.bodyLength) {
                                return Promise.resolve(
                                    {
                                        type: vscode.FileType.File,
                                        ctime: 0,
                                        mtime: Date.now(),
                                        size: p_result.bodyLength // this.leoIntegration.bodyText.length
                                    }
                                );
                            } else {
                                return Promise.resolve({
                                    type: vscode.FileType.File,
                                    ctime: 0,
                                    mtime: Date.now(),
                                    size: 0 // this.leoIntegration.bodyText.length
                                });
                            }
                        });
                }
            }
        } else {
            throw vscode.FileSystemError.FileNotFound(); // console.log("not ready");
        }
    }

    public readDirectory(uri: vscode.Uri): Thenable<[string, vscode.FileType][]> {
        // console.log('called readDirectory', uri.fsPath);
        if (uri.fsPath === '/') {
            return this.refreshPossibleGnxList().then((p_result) => {
                // console.log('FROM readDirectory - got back from getAllGnx:', p_result);
                const w_directory: [string, vscode.FileType][] = [];
                p_result.forEach((p_gnx: string) => {
                    w_directory.push([p_gnx, vscode.FileType.File]);
                });
                return Promise.resolve(w_directory);
            });
        } else {
            throw vscode.FileSystemError.FileNotFound();
        }
    }

    public createDirectory(uri: vscode.Uri): void {
        console.log('called createDirectory'); // should not happen
        throw vscode.FileSystemError.NoPermissions();
    }

    public readFile(uri: vscode.Uri): Thenable<Uint8Array> {
        if (this.leoIntegration.fileOpenedReady) {
            if (uri.fsPath === '/') {
                throw vscode.FileSystemError.FileIsADirectory();
            } else {
                const w_gnx = uri.fsPath.substr(1);
                if (!this.possibleGnxList.includes(w_gnx)) {
                    // console.log("hey! Not in list! readFile missing refreshes??");
                    throw vscode.FileSystemError.FileNotFound();
                } else {
                    return this.leoIntegration.leoBridge.action(Constants.LEOBRIDGE_ACTIONS.GET_BODY, '"' + w_gnx + '"')
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

    public writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void {
        // console.log('called writeFile!', uri.fsPath);
    }

    public rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
        // console.log('called rename');
        // throw vscode.FileSystemError.NoPermissions();
    }

    public delete(uri: vscode.Uri): void {
        // console.log('called delete ', uri.fsPath);
        // throw vscode.FileSystemError.NoPermissions();
    }

    public copy(uri: vscode.Uri): void {
        console.log('called copy'); // should not happen
        throw vscode.FileSystemError.NoPermissions();
    }

    // TODO : --- manage file events. ...IS THIS NECESSARY?

    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    private _fireSoon(...events: vscode.FileChangeEvent[]): void {
        this._bufferedEvents.push(...events);

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