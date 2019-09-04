import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";

// * There is an activation event `onFileSystem:<scheme>` that fires when a file is being accessed
export class LeoBodyFsProvider implements vscode.FileSystemProvider {

    // * An event to signal that a resource has been changed
    // * it should fire for resources that are being [watched](#FileSystemProvider.watch) by clients of this provider
    private _onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFileEmitter.event;

    constructor(private leoIntegration: LeoIntegration) {
        console.log('LeoBodyFsProvider constructor');
        leoIntegration.setupRefreshBodyFn(this._onDidChangeFileEmitter);
    }

    watch(_resource: vscode.Uri): vscode.Disposable {
        console.log('watch called! path:', _resource.fsPath);
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
    }

    stat(uri: vscode.Uri): vscode.FileStat {
        console.log('called stat', this.leoIntegration.bodyText.length);
        if (uri.fsPath === '/') {
            return {
                type: vscode.FileType.Directory,
                ctime: 0,
                mtime: Date.now(),
                size: 0
            };
        } else if (uri.fsPath === '/body') {
            return {
                type: vscode.FileType.File,
                ctime: 0,
                mtime: Date.now(),
                size: this.leoIntegration.bodyText.length
            };
        } else {
            throw vscode.FileSystemError.FileNotFound();
        }
    }

    readDirectory(uri: vscode.Uri): Thenable<[string, vscode.FileType][]> {
        console.log('called readDirectory', uri.fsPath);
        //const entry = this._lookupAsDirectory(uri, false);
        let result: [string, vscode.FileType][] = [];
        result.push(['body', vscode.FileType.File]); // only body for now
        return Promise.resolve(result);
    }
    createDirectory(uri: vscode.Uri): void {
        console.log('called createDirectory');
        throw vscode.FileSystemError.NoPermissions();
    }
    readFile(uri: vscode.Uri): Thenable<Uint8Array> {
        console.log('called readFile', uri.fsPath);
        if (uri.fsPath === '/') {
            throw vscode.FileSystemError.FileIsADirectory();
        } else if (uri.fsPath === '/body') {
            if (this.leoIntegration.bodyText) {
                return Promise.resolve(Buffer.from(this.leoIntegration.bodyText));
            } else {
                return Promise.resolve(Buffer.from(" "));
            }
        } else {
            throw vscode.FileSystemError.FileNotFound();
        }

    }
    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void {
        // TODO : Send/Save on leoBridge's side!
        console.log('called writeFile!', uri.fsPath);
    }
    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
        console.log('called oldUri');
        throw vscode.FileSystemError.NoPermissions();
    }
    delete(uri: vscode.Uri): void {
        console.log('called uri');
        throw vscode.FileSystemError.NoPermissions();
    }
    copy(uri: vscode.Uri): void {
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

