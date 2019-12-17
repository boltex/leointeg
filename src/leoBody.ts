import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";

export class LeoBodyProvider implements vscode.FileSystemProvider {
    // * The bodies of Leo nodes are implemented as a 'file system' in the vscode api
    // * Saving and renaming prevents flickering and prevents undos to 'traverse through' nodes, see leoIntegration.ts
    // * Note that there is an activation event `onFileSystem:<scheme>` that fires when a file is being accessed

    // * Last file read data with the readFile method
    private lastGnx = ""; // gnx of last file read
    private lastGnxBodyLength = 0; // length of last file read

    // * list of currently opened body panes gnx (from 'watch' & 'dispose' methods)
    public openedBodiesGnx: string[] = [];
    // * list of all possible vNodes gnx in the currently opened leo file (since last refresh/tree operation)
    public possibleGnxList: string[] = [];

    // * An event to signal that a resource has been changed
    // * It should fire for resources that are being [watched](#FileSystemProvider.watch) by clients of this provider
    private _onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFileEmitter.event;

    constructor(private leoIntegration: LeoIntegration) { }

    public refreshPossibleGnxList(): Thenable<string[]> {
        // get updated list of possible gnx
        console.log('calling leoBridge with getAllGnx');
        return this.leoIntegration.leoBridge.action("getAllGnx", "{}").then((p_result) => {
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
        // ! should have a fresh possibleGnx list beforehand
        const w_gnxToClose: string[] = [];
        this.openedBodiesGnx.forEach(p_openedGnx => {
            if (!this.possibleGnxList.includes(p_openedGnx)) {
                w_gnxToClose.push(p_openedGnx);
            }
        });
        return Promise.resolve(w_gnxToClose);
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

    public stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        if (this.leoIntegration.fileOpenedReady) {
            if (uri.fsPath === '/') {
                console.log('called stat on root : "/" ! ');
                return { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 };
            } else if (uri.fsPath === '/' + this.lastGnx) {
                return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: this.lastGnxBodyLength };
            } else {
                const w_gnx = uri.fsPath.substr(1);
                if (!this.possibleGnxList.includes(w_gnx)) {
                    console.log("hey! Not in list! stat missing refreshes??");
                    throw vscode.FileSystemError.FileNotFound();
                } else {
                    return this.leoIntegration.leoBridge.action("getBodyLength", '"' + w_gnx + '"')
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
        console.log('called readDirectory', uri.fsPath);
        if (uri.fsPath === '/') {
            return this.refreshPossibleGnxList().then((p_result) => {
                console.log('FROM readDirectory - got back from getAllGnx:', p_result);
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
        console.log('called createDirectory');
        throw vscode.FileSystemError.NoPermissions();
    }

    public readFile(uri: vscode.Uri): Thenable<Uint8Array> {
        if (this.leoIntegration.fileOpenedReady) {
            if (uri.fsPath === '/') {
                throw vscode.FileSystemError.FileIsADirectory();
            } else {
                const w_gnx = uri.fsPath.substr(1);
                if (!this.possibleGnxList.includes(w_gnx)) {
                    console.log("hey! Not in list! readFile missing refreshes??");
                    throw vscode.FileSystemError.FileNotFound();
                } else {
                    return this.leoIntegration.leoBridge.action("getBody", '"' + w_gnx + '"')
                        .then((p_result) => {
                            this.lastGnx = w_gnx;
                            if (p_result.bodyData) {
                                this.lastGnxBodyLength = p_result.bodyData.length;
                                return Promise.resolve(Buffer.from(p_result.bodyData));
                            } else if (p_result.bodyData === "") {
                                this.lastGnxBodyLength = 0;
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
        console.log('called writeFile!', uri.fsPath);
    }

    public rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
        // console.log('called rename');
        // throw vscode.FileSystemError.NoPermissions();
    }

    public delete(uri: vscode.Uri): void {
        // console.log('called delete');
        // throw vscode.FileSystemError.NoPermissions();
    }

    public copy(uri: vscode.Uri): void {
        console.log('called copy');
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
            this._bufferedEvents.length = 0;
        }, 5);
    }
}

