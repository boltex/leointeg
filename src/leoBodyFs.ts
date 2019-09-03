import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";


export class BodyFileStatTest implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;

    constructor(p_size: number) {
        this.type = vscode.FileType.File;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = p_size;
    }
}


/**
 * The filesystem provider defines what the editor needs to read, write, discover,
 * and to manage files and folders. It allows extensions to serve files from remote places,
 * like ftp-servers, and to seamlessly integrate those into the editor.
 *
 * * *Note 1:* The filesystem provider API works with [uris](#Uri) and assumes hierarchical
 * paths, e.g. `foo:/my/path` is a child of `foo:/my/` and a parent of `foo:/my/path/deeper`.
 * * *Note 2:* There is an activation event `onFileSystem:<scheme>` that fires when a file
 * or folder is being accessed.
 * * *Note 3:* The word 'file' is often used to denote all [kinds](#FileType) of files, e.g.
 * folders, symbolic links, and regular files.
 */
export class LeoBodyFsProvider implements vscode.FileSystemProvider {
    /**
     * An event to signal that a resource has been created, changed, or deleted. This
     * event should fire for resources that are being [watched](#FileSystemProvider.watch)
     * by clients of this provider.
     */
    private _onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFileEmitter.event;


    //
    constructor(private leoIntegration: LeoIntegration) {
        console.log('LeoBodyFsProvider constructor');
        leoIntegration.setupRefreshBodyFn(this._onDidChangeFileEmitter);
    }


    // Subscribe to events in the file or folder denoted by `uri`.
    // The editor will call this function for files and folders. In the latter case, the
    // options differ from defaults, e.g. what files/folders to exclude from watching
    // and if subfolders, sub-subfolder, etc. should be watched (`recursive`).
    //
    // @param uri The uri of the file to be watched.
    // @param options Configures the watch.
    // @returns A disposable that tells the provider to stop watching the `uri`.
    //
    // watch(uri: Uri, options: { recursive: boolean; excludes: string[] }): Disposable;
    watch(_resource: vscode.Uri): vscode.Disposable {
        console.log('watch called!');
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
    }


    // Note that the metadata for symbolic links should be the metadata of the file they refer to.
    // Still, the [SymbolicLink](#FileType.SymbolicLink)-type must be used in addition to the actual type, e.g.
    // `FileType.SymbolicLink | FileType.Directory`.
    //
    // @param uri The uri of the file to retrieve metadata about.
    // @return The file metadata about the file.
    // @throws [`FileNotFound`](#FileSystemError.FileNotFound) when `uri` doesn't exist.
    stat(uri: vscode.Uri): vscode.FileStat {
        console.log('called stat', uri.fsPath);
        return new BodyFileStatTest(this.leoIntegration.bodyText.length);  // Fake Dates, size = 0
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
        if (true || uri.fsPath === '') { // TODO : check if uri is leo:body
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

    // TODO : --- manage file events IS THIS NECESSARY?

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

