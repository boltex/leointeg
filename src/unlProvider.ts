import * as vscode from 'vscode';
import { Constants } from "./constants";

export class UnlProvider implements vscode.DocumentLinkProvider {

    /*
        * GNX-based UNL Samples
        unl:gnx://leoPy.leo#ekr.20230626064652.1
        unl:gnx://myProject.leo#node12345678.1
        unl:gnx://codeRepo.leo#function.20231231.1
    
        * Headline-based UNL Samples
        unl://C:/leo.repo/leo-editor/leo/doc/LeoDocs.leo#Getting Started-->Introduction
        unl://D:/work/notes.leo#Meeting Notes-->2023-->March-->Project X Discussion
        unl://myDocuments/notes.leo#Ideas-->New Concepts-->brainstorming-session
        unl://relativePath/myFile.leo#Chapter 1-->Section 2-->Paragraph 3
        unl://C:/projects/leoProject.leo#Code Review-->Module 1-->Function XYZ-->Improvements
    
        * Mixed Characters and Edge Cases
        unl://path/to/file.leo#Headline-with-Dashes-->Sub-section-->Item 1
        unl://anotherPath/docs.leo#Special Characters!-->@$%^&*
        unl://leoFile.leo#Testing-->Edge-->Cases-->with-->Multiple Separators

        REFERENCE IN leoGlobals.py
         2. New in Leo 6.7.4: UNLs based on gnx's (global node indices):
        
            Links of the form `unl:gnx:` + `//{outline}#{gnx}` open the given
            outline and select the first outline node with the given gnx. These UNLs
            will work as long as the node exists anywhere in the outline.
        
            For example, the link: `unl:gnx://#ekr.20031218072017.2406` refers to this
            outline's "Code" node. Try it. The link works in this outline.

    */

    // private gnxUnlRegex = /\bunl:gnx:[^\r\n#]*#\S*/g; // This allows spaces and content after the UNL.
    // private headlineUnlRegex = /\bunl:(?!gnx:)[^\r\n#]*#[^\r\n]*\S/g; // This goes on until end of line.

    // *It seems that the double slash is required for valid UNLs (as per this comment in p.get_UNL and related methods in leoNodes.py)

    // All unls must contain a file part: f"//{file-name}#"
    // The file-name may be empty.

    private gnxUnlRegex = /\bunl:gnx:\/\/[^\r\n#]*#\S*/g; // This allows spaces and content after the UNL.
    private headlineUnlRegex = /\bunl:\/\/[^\r\n#]*#[^\r\n]*\S/g; // This goes on until end of line.

    public provideDocumentLinks(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink[]> {
        const text = document.getText();
        const links: vscode.DocumentLink[] = [];
        const scheme = document.uri.scheme;
        let match;

        // GNX-based UNLs
        while ((match = this.gnxUnlRegex.exec(text)) !== null) {
            const range = new vscode.Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length));
            const args = encodeURIComponent(JSON.stringify({ unl: match[0], scheme: scheme }));
            links.push(new vscode.DocumentLink(range, vscode.Uri.parse(`command:${Constants.COMMANDS.HANDLE_UNL}?${args}`)));
        }

        //  Headline - based UNLs
        while ((match = this.headlineUnlRegex.exec(text)) !== null) {
            const range = new vscode.Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length));
            const args = encodeURIComponent(JSON.stringify({ unl: match[0], scheme: scheme }));
            links.push(new vscode.DocumentLink(range, vscode.Uri.parse(`command:${Constants.COMMANDS.HANDLE_UNL}?${args}`)));
        }

        return links;
    }
}
