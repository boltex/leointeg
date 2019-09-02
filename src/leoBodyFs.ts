import * as vscode from "vscode";
import { LeoIntegration } from "./leoIntegration";


export class BodyFileStatTest implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;

    constructor() {
        this.type = vscode.FileType.File;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
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
        console.log('called stat');
        return new BodyFileStatTest();  // Fake Dates, size = 0
    }

    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
        console.log('called readDirectory');
        //const entry = this._lookupAsDirectory(uri, false);
        let result: [string, vscode.FileType][] = [];
        // for (const [name, child] of entry.entries) {
        //     result.push([name, child.type]);
        // }
        return result;
    }
    createDirectory(uri: vscode.Uri): void {
    }
    readFile(uri: vscode.Uri): Uint8Array {
        console.log('called readFile');
        const data = Buffer.from('abcdef');
        if (data) {
            return data;
        }
        throw vscode.FileSystemError.FileNotFound();
    }
    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void {
        console.log('called writeFile');
    }
    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
        console.log('called oldUri');
    }
    delete(uri: vscode.Uri): void {
        console.log('called uri');
    }


}