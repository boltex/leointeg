import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";

// * There is an activation event `onFileSystem:<scheme>` that fires when a file is being accessed
export class LeoBodyProvider implements vscode.FileSystemProvider {


    private lastGnx = "";
    private lastGnxBodyLength = 0;

    // * An event to signal that a resource has been changed
    // * it should fire for resources that are being [watched](#FileSystemProvider.watch) by clients of this provider
    private _onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFileEmitter.event;

    constructor(private leoIntegration: LeoIntegration) {
        leoIntegration.setupRefreshBodyFn(this._onDidChangeFileEmitter);
    }

    watch(_resource: vscode.Uri): vscode.Disposable {
        console.log('watch called! path:', _resource.fsPath);
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
    }

    stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        console.log('called stat', uri.fsPath);
        if (uri.fsPath === '/') {
            return {
                type: vscode.FileType.Directory,
                ctime: 0,
                mtime: Date.now(),
                size: 0
            };
        } else if (uri.fsPath === '/' + this.lastGnx) {
            return {
                type: vscode.FileType.File,
                ctime: 0,
                mtime: Date.now(),
                size: this.lastGnxBodyLength // this.leoIntegration.bodyText.length
            };
        } else {
            console.log('had to get stats manually');
            return this.leoIntegration.leoBridgeAction("getBody", '"' + uri.fsPath.substr(1) + '"')
                .then((p_result) => {
                    if (p_result.bodyData) {
                        return Promise.resolve(
                            {
                                type: vscode.FileType.File,
                                ctime: 0,
                                mtime: Date.now(),
                                size: p_result.bodyData.length // this.leoIntegration.bodyText.length
                            }
                        );
                    } else {
                        return Promise.resolve({
                            type: vscode.FileType.File,
                            ctime: 0,
                            mtime: Date.now(),
                            size: 0// this.leoIntegration.bodyText.length
                        });
                    }
                });
        }
        // } else {
        //     console.log('Error stat on file not folowing a getBody');
        //     throw vscode.FileSystemError.FileNotFound();
        // }
    }

    readDirectory(uri: vscode.Uri): Thenable<[string, vscode.FileType][]> {
        console.log('called readDirectory', uri.fsPath);
        //const entry = this._lookupAsDirectory(uri, false);
        let result: [string, vscode.FileType][] = [];
        //result.push(['body', vscode.FileType.File]); // only body for now
        if (this.lastGnx) {
            result.push([this.lastGnx, vscode.FileType.File]); // only body for now
        }
        return Promise.resolve(result);
    }

    createDirectory(uri: vscode.Uri): void {
        console.log('called createDirectory');
        throw vscode.FileSystemError.NoPermissions();
    }

    readFile(uri: vscode.Uri): Thenable<Uint8Array> {
        console.log('called readFile', uri.fsPath.substr(1));
        if (uri.fsPath === '/') {
            throw vscode.FileSystemError.FileIsADirectory();
            // } else if (uri.fsPath === '/body') {
        } else {
            this.lastGnx = uri.fsPath.substr(1);
            return this.leoIntegration.leoBridgeAction("getBody", '"' + this.lastGnx + '"')
                .then((p_result) => {
                    if (p_result.bodyData) {
                        this.lastGnxBodyLength = p_result.bodyData.length;
                        return Promise.resolve(Buffer.from(p_result.bodyData));
                    } else {
                        this.lastGnxBodyLength = 0;
                        return Promise.resolve(Buffer.from(" "));
                    }
                });

            // return new Promise((resolve, reject) => {
            //     this.leoIntegration.leoBridgeAction("getBody", '"' + uri.fsPath.substr(1) + '"')
            //         .then((p_result) => {
            //             if (p_result.bodyData) {
            //                 return resolve(Buffer.from(p_result.bodyData));
            //             } else {
            //                 return resolve(Buffer.from(" "));
            //             }
            //         });
            // });


        }
        // TODO : Add case for GNX 'not found' : throw vscode.FileSystemError.FileNotFound();
        // }else {
        //         throw vscode.FileSystemError.FileNotFound();
        //       }
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void {
        // TODO : Send/Save on leoBridge's side!
        console.log('called writeFile!', uri.fsPath);
        if (uri.fsPath === '/body') {

            // this.leoIntegration.setNewBody(content.toString()).then((p_node) => {
            //     console.log('back from write file', p_node.label);
            // });
        }
    }

    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
        console.log('called rename');
        throw vscode.FileSystemError.NoPermissions();
    }
    delete(uri: vscode.Uri): void {
        console.log('called delete');
        throw vscode.FileSystemError.NoPermissions();
    }
    copy(uri: vscode.Uri): void {
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

