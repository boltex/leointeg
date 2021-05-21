import * as vscode from "vscode";
import * as utils from "./utils";
import * as path from 'path';
import { Constants } from "./constants";
import { LeoIntegration } from "./leoIntegration";
import { BodyTimeInfo } from "./types";

/**
 * * Body panes implementation as a file system using "leo" as a scheme identifier
 * TODO : Replace save/rename procedure to overcome API change for undos.
 * Saving and renaming prevents flickering and prevents undos to 'traverse through' different gnx
 */
export class LeoBodyProvider implements vscode.FileSystemProvider {

    // * Flag normally false
    public preventSaveToLeo: boolean = false;

    // * Simple structure to keep mtime of selected and renamed body virtual files
    private _selectedBody: string = "";

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

        // console.log('Selected', w_gnx, ' total:', this._openedBodiesGnx.length);

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
        this._selectedBody = p_gnx;
        if (!this._openedBodiesGnx.includes(p_gnx)) {
            console.error("ASKED TO REFRESH NOT EVEN IN SELECTED BODY: ", p_gnx);
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
    public refreshPossibleGnxList(): Thenable<string[]> {
        // * Get updated list of possible gnx
        return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_ALL_GNX).then((p_result) => {
            this._possibleGnxList = p_result.gnx || [];
            return Promise.resolve(this._possibleGnxList);
        });
    }

    public watch(p_resource: vscode.Uri): vscode.Disposable {
        const w_gnx = utils.leoUriToStr(p_resource);

        if (!this._watchedBodiesGnx.includes(w_gnx)) {
            // console.log('MORE fs watch put in _openedBodiesGnx:', p_resource.fsPath);
            this._watchedBodiesGnx.push(w_gnx); // add gnx
        } else {
            // console.warn('MORE fs watch: already in _openedBodiesGnx:', p_resource.fsPath);

        }
        return new vscode.Disposable(() => {
            const w_position = this._watchedBodiesGnx.indexOf(w_gnx); // find and remove it
            if (w_position > -1) {
                // console.log('MORE fs removed from _openedBodiesGnx: ', w_gnx);
                this._watchedBodiesGnx.splice(w_position, 1);
            }
        });
    }

    public stat(p_uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        // TODO : Fix/Check extraneous stat(...) call(s)

        if (this._leoIntegration.leoStates.fileOpenedReady) {
            const w_gnx = utils.leoUriToStr(p_uri);
            if (p_uri.fsPath.length === 1) { // p_uri.fsPath === '/' || p_uri.fsPath === '\\'
                // console.log('called stat on root');
                return { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 };

            } else if (w_gnx === this._lastGnx && this._openedBodiesGnx.includes(this._lastGnx)) {

                // If same as last checked, sending back time at absolute past
                // ? VERIFY this._selectedBody.mtime we get file changed on disk error??
                // console.log('VERIFY this._selectedBody.mtime we get file changed on disk error :', p_uri);
                return {
                    type: vscode.FileType.File,
                    ctime: this._openedBodiesInfo[this._lastGnx].ctime,
                    mtime: this._openedBodiesInfo[this._lastGnx].mtime,
                    size: this._lastBodyLength
                };

            } else if (this._openedBodiesGnx.includes(w_gnx)) {

                return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_BODY_LENGTH, '"' + w_gnx + '"')
                    .then((p_result) => {
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
        throw vscode.FileSystemError.FileNotFound();
    }

    public readFile(p_uri: vscode.Uri): Thenable<Uint8Array> {
        if (this._leoIntegration.leoStates.fileOpenedReady) {
            if (p_uri.fsPath.length === 1) { // p_uri.fsPath === '/' || p_uri.fsPath === '\\'
                throw vscode.FileSystemError.FileIsADirectory();
            } else {
                const w_gnx = utils.leoUriToStr(p_uri);
                // if (!this._possibleGnxList.includes(w_gnx)) {
                if (!this._openedBodiesGnx.includes(w_gnx)) {
                    console.error("readFile: ERROR File not in _openedBodiesGnx! readFile missing refreshes?");
                    throw vscode.FileSystemError.FileNotFound();
                } else {
                    return this._leoIntegration.sendAction(Constants.LEOBRIDGE.GET_BODY, '"' + w_gnx + '"')
                        .then((p_result) => {
                            if (p_result.body) {
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
                                if (this._lastGnx === w_gnx) {
                                    // was last gnx of closed file about to be switched to new document selected
                                    console.log('Passed in not found: ' + w_gnx);

                                    return Promise.resolve(Buffer.from(this._lastBodyData));
                                }
                                console.error("ERROR => readFile of unknown GNX"); // is possibleGnxList updated correctly?
                                return Promise.resolve(Buffer.from(""));
                                //  throw vscode.FileSystemError.FileNotFound();
                            }
                        });
                }
            }
        } else {
            throw vscode.FileSystemError.FileNotFound();
        }
    }

    public readDirectory(p_uri: vscode.Uri): Thenable<[string, vscode.FileType][]> {
        console.warn('Called readDirectory with ', p_uri.fsPath); // should not happen
        if (p_uri.fsPath.length === 1) { // p_uri.fsPath === '/' || p_uri.fsPath === '\\'
            const w_directory: [string, vscode.FileType][] = [];
            w_directory.push([this._selectedBody, vscode.FileType.File]);
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
        // console.log('trigger called in writeFile');

        if (!this.preventSaveToLeo) {
            this._leoIntegration.triggerBodySave(true); // Might have been a vscode 'save' via the menu
        } else {
            console.log('PREVENTED SAVE BODY TO LEO');

            this.preventSaveToLeo = false;
        }


        const w_gnx = utils.leoUriToStr(p_uri);

        if (!this._openedBodiesGnx.includes(w_gnx)) {
            console.error("ASKED TO SAVE NOT EVEN IN SELECTED BODY: ", w_gnx);
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
        // console.log("delete", p_uri.fsPath);
        const w_gnx = utils.leoUriToStr(p_uri);
        if (this._openedBodiesGnx.includes(w_gnx)) {
            this._openedBodiesGnx.splice(this._openedBodiesGnx.indexOf(w_gnx), 1);
            delete this._openedBodiesInfo[w_gnx];
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
        throw vscode.FileSystemError.NoPermissions();
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
