import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";

export class LeoBodyProvider implements vscode.FileSystemProvider {
    // * The bodies of Leo nodes are implemented as a 'file system' in the vscode api
    // * Saving and renaming prevents flickering and prevents undos to 'traverse through' nodes, see leoIntegration.ts
    // * Note that there is an activation event `onFileSystem:<scheme>` that fires when a file is being accessed

    private lastGnx = "";
    private lastGnxBodyLength = 0;

    // * An event to signal that a resource has been changed
    // * it should fire for resources that are being [watched](#FileSystemProvider.watch) by clients of this provider
    private _onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFileEmitter.event;

    constructor(private leoIntegration: LeoIntegration) { }

    public watch(_resource: vscode.Uri): vscode.Disposable {
        // * for now, ignore, fires for all changes
        // TODO : Handle watch / dispose
        console.log('watch called! path:', _resource.fsPath);
        return new vscode.Disposable(() => {
            // console.log('disposed file');
        });
    }

    public stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        if (this.leoIntegration.fileOpenedReady) {
            if (uri.fsPath === '/') {
                console.log('called stat on root : "/" ! ');
                return {
                    type: vscode.FileType.Directory,
                    ctime: 0,
                    mtime: 0, // Date.now(),
                    size: 0
                };
            } else if (uri.fsPath === '/' + this.lastGnx) {
                return {
                    type: vscode.FileType.File,
                    ctime: 0,
                    mtime: 0, // Date.now(),
                    size: this.lastGnxBodyLength // this.leoIntegration.bodyText.length
                };
            } else {
                const w_gnx = uri.fsPath.substr(1);
                return this.leoIntegration.leoBridge.action("getBodyLength", '"' + w_gnx + '"')
                    .then((p_result) => {
                        // this.lastGnx = w_gnx; // * Leave as is for now : requires more testing
                        if (p_result.bodyLength) {
                            // this.lastGnxBodyLength = p_result.bodyLength; // * Leave as is for now
                            return Promise.resolve(
                                {
                                    type: vscode.FileType.File,
                                    ctime: 0,
                                    mtime: Date.now(),
                                    size: p_result.bodyLength // this.leoIntegration.bodyText.length
                                }
                            );
                        } else {
                            // this.lastGnxBodyLength = 0; // * Leave as is for now
                            return Promise.resolve({
                                type: vscode.FileType.File,
                                ctime: 0,
                                mtime: Date.now(),
                                size: 0 // this.leoIntegration.bodyText.length
                            });
                        }
                    });
            }
            // } else {
            //     console.log('Error stat on file not following a getBody');
            //     throw vscode.FileSystemError.FileNotFound();
            // }
        } else {
            // console.log("not ready");
            throw vscode.FileSystemError.FileNotFound();
            // return {
            //   type: vscode.FileType.File,
            //   ctime: 0,
            //   mtime: 0, // Date.now(),
            //   size: 0 // this.leoIntegration.bodyText.length
            // };
        }
    }

    public readDirectory(uri: vscode.Uri): Thenable<[string, vscode.FileType][]> {
        console.log('called readDirectory', uri.fsPath);

        // TODO test this
        // getAllGnx in leobridge will return an array of gnx strings: allGnx
        if (uri.fsPath === '/') {
            return this.leoIntegration.leoBridge.action("getAllGnx", "{}").then((p_result) => {

                console.log('got back from getAllGnx:', p_result.allGnx);

                const w_directory: [string, vscode.FileType][] = [];
                if (p_result.allGnx) {
                    p_result.allGnx.forEach((p_gnx: string) => {
                        w_directory.push([p_gnx, vscode.FileType.File]);
                    });
                    Promise.resolve(w_directory);
                } else {
                    Promise.resolve([]);
                }
                return p_result.allGnx;
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
            // console.log('called readFile', uri.fsPath.substr(1));
            if (uri.fsPath === '/') {
                throw vscode.FileSystemError.FileIsADirectory();
            } else {
                const w_gnx = uri.fsPath.substr(1);
                return this.leoIntegration.leoBridge.action("getBody", '"' + w_gnx + '"')
                    .then((p_result) => {
                        this.lastGnx = w_gnx;

                        if (p_result.bodyData) {
                            this.lastGnxBodyLength = p_result.bodyData.length;
                            return Promise.resolve(Buffer.from(p_result.bodyData));
                        } else if (p_result.bodyData === "") {
                            console.log('bodyData was just empty string');
                            this.lastGnxBodyLength = 0;
                            return Promise.resolve(Buffer.from(""));
                        } else {
                            console.log('no bodyData at all : so no gnx/file not found');
                            throw vscode.FileSystemError.FileNotFound();
                        }
                    });
            }
        } else {
            //console.log('read also not ready');
            throw vscode.FileSystemError.FileNotFound();
            // setTimeout(() => {
            //   this.leoIntegration.closeLeoTextDocuments();
            // }, 50);
            // return Promise.resolve(Buffer.from(""));
        }
        // TODO : Add case for GNX 'not found' : throw vscode.FileSystemError.FileNotFound();
    }

    public writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void {
        // console.log('called writeFile!', uri.fsPath);
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

