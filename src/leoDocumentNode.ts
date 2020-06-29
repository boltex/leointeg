import * as vscode from "vscode";
import { Constants } from "./constants";


export class LeoDocumentNode extends vscode.TreeItem {

    constructor(
        public documentEntry: any
    ) {
        super(documentEntry.name);
        // this.command = {        };
    }


}