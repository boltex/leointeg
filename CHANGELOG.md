# Change Log

## 1.0.16

- ...

## 1.0.15

- Added description under command label in minibuffer-history's user input box.
- Fixed default keybindings for alt+home and alt+end. (goto first/last visible node)
- Fixed critical bug with the 'python command' user setting.
- Fixed 'new' command to force-show Leo's body and outline panes.
- Server manager now offers better error handling and status messages when starting a server and/or connecting to it.
- Improved 'when' conditions for keybindings to have command trigger at appropriate times. (Having focus on the right panels for commands to trigger)
- Commands that toggle search settings in the 'find' panel will make sure the panel is visible before toggling the setting.
- Custom @button, @rclick and @command entries of the minibuffer are now shown with proper ordering, description and icon.
- Branch for opened Leo document now hidden by default in outline's title.
- Added new option setting "showBranchInOutlineTitle" to show the branch with the filename in the outline's title bar.
- Settings panel now shows the resulting command used to spawn the server process (built from the various server startup settings).
- Added a 100ms delay when selecting opened document node in document panel to fix a bug where activity bar would flash when switching from leo view to explorer view when document pane was opened.

## 1.0.14

- Made package much smaller by fixing webpack compilation. (from 5.6mb to 760kb)
- Added 'new', 'Open' and 'Save' icons to the outline pane's title bar.
- Fixed links in welcome page.
- Made package smaller by excluding image files for readme and other .md files in resources folder.
- Fixed 'minibuffer' preserving of the body pane before opening input.
- Added 'revert' command used to 'Revert to Saved' the currently opened Leo document.
- Added 'tag' related commands to outline nodes context menu, and to the minibuffer.
- Added goto-global-line functionality to the minibuffer with direct access via direct 'number' entry.
- Fixed input box entry UI for various commands. (insert-child, insert-node, clone-find-tag, etc.)
- Added 'tab-cycle-next' command and the Ctrl+Tab keybinding shortcut to cycle opened Leo documents.
- Fixed the 'focus-on-tree' command, along with the Alt+T shortcut, to work from Leo panes other than the body pane.
- Fixed 'opening' a Leo file (normally or via right-click) to force-show the main Leo panes (outline and body).

## 1.0.13

- Added missing find panel settings toggle commands to the minibuffer override.
- Fixed setting synchronization that was lagging by one change when going from vscode to leoInteg's welcome/setting panel.

## 1.0.12

- Fixed undo pane's context menu for unchanged document.
- Fixed minibuffer history item order that had unordered entries in some cases. Also keeps unique entries as per Leo's original behavior.
- Fixed keyboard navigation in the 'Goto Panel'. Arrow navigation is now possible.
- Added support for @killcolor and @nocolor-node color suppression directives: requires Leo 6.7.2
- Fixed 'when' condition for keybindings of 'replace' & 'replace-then-find'.
- Completed set of search commands: re-search, word-search and their backward variants.
- Fixed defaults set as placeholders in search commands that use an input box.
- Added support for search commands to leave selection range in tree headlines: requires Leo 6.7.2
- Removed status-bar indicator and related settings until vscode's API allows for focus detection.
- Clicking on the \<find pattern here\> text of the find panel selects all the text to replace easily.
- Fixed auto-closing/restoring body panes at vscode's startup which would cause the 'Cannot save / newer file' error.
- Fixed 'on document changed' logic which would leave the node icon in the wrong 'has-body-content' visual state.
- Trying to open an already opened Leo document now properly selects that document instead of the last one in the list.

## 1.0.11

- Fixed 'openAside' context menu entry in explorer.
- Fixed context variables used for views-welcome in package.json.

## 1.0.10

- Added 'navigation' flag to 'goto_next_clone' and 'goto_next_marked' commands to force open body and outline if not visible.
- fixed icon path string generation.
- Added icons to the undo pane.
- Added asterisk to outline title to flag 'changed' document.
- Added branch info, and opened-file description to outline title: requires Leo 6.7.1
- Improved page-up/page-down behavior when already on first/last sibling.
- Added the Ctrl+Shift+L keyboard shortcut to reveal the 'LeoInteg' view in the activity bar. (Can be toggled via config setting)
- The Alt+'-' keyboard shortcut that also applies by default to vscode's explorer view when focus is outside LeoInteg's panels, can now be toggled via config setting.
- Changed the behavior of the 'Go Anywhere' command to offer a quick-input search control to search headlines.
- The 'Go Anywhere' command is also now exposed as the Ctrl+P keyboard shortcut, replacing vscode's 'Go to File' command when focus is in any LeoInteg's panel. (Can be toggled via config setting)
- Fixed colorization of section references, along with support for @color and @nocolor directives.

## 1.0.9

- Fixed minibuffer history order.
- Fixed keyboard navigation in the goto pane: focus no more flashes.
- Fixed navigation commands, including alt+arrow keys, to show outline if hidden.
- Fixed body edit undo bead creation frequency (when documents pane is not visible.)
- Fixed expand-collapse node selection prior to an 'insert' command.

## 1.0.8

- Added an 'undo panel' that shows actions history and supports right-clicking to go to any undo point.
- Added and improved icons sets for disabled icon-buttons and common actions.
- Tooltips and description do not contain the whole u.a. when listing positions.
  (Hovering the mouse triggers the retrieval of this info for a single node.)
- Initial node selection when opening Leo Documents: Fixed in leoserver 1.0.3 to come out in Leo 6.6.4.
- Zoom-in/Zoom-out vscode commands now called instead of replace next/previous (on Ctrl+/-) if no text range selected.
- Re-wrote the main tree outline view integration: Revised and refactored internal tree model.
- Disabled commands created with enablement clauses instead of extraneous commands.
- Replaced the page-up/page-down Outline keyboard shortcut commands with goto-first-sibling and goto-last-sibling
- 'new leo document' CTRL+N and 'open leo file' CTRL+O keybindings can now also be used with focus in the body pane
- Start position selected upon opening is now fixed, and not forced as the first one
- Many minibuffer-only commands are now fixed and available through the minibuffer itself, and for some, the vscode command palette.
- Removed 'close on delete' setting requirement because of the new vscode API to control individual tabs as needed.
- DB file extensions support: Load / Save-as now supports .db file extension.
- Added 'minibuffer history' as top choice of minibuffer entries.
- Fixed config settings that were not working in tandem with leoserver. (Ask for refreshing, invert node colors, etc.)
- New requirement Leo version 6.7 is now the minimal version required.
- Fixed mouse expand/collapse behavior in outline when 'leo tree browsing' is off.
- changing 'invert node dirty' color scheme now changes / refreshes after saving the setting.
- Goto Panel can now be browsed with the keyboard arrow keys. The focus will stay on the goto pane while displaying results.
- Goto panel can be cleared by pressing 'enter' in a cleared/empty nav input box (in the find panel).

## 1.0.7

- Added 'Nav-tab' and 'Tags-tab' functionality to the 'Find panel'. (Requires Leo minimal version of at least 6.6-final)
- Outline now shows distinct icons and labels to distinguish generic user-attributes from 'tags'.
- Added 'Goto Anywhere' panel, with buttons for showing lists from common node attributes searches:
  - 'Timeline' nodes by creation date
  - Changed/Dirty nodes
  - History of visited nodes
  - Marked nodes
  - Nav search with currently selected body text
- Made those same commands available through vscode command palettes and user keybindings.
- Added leoID check upon connection, and implemented a dialog to capture and set the leoID on the server, equivalent to <https://leo-editor.github.io/leo-editor/running.html?highlight=leoid#running-leo-the-first-time>

## 1.0.6

- Prevent reappearance of unknown-language warnings in a session, for a given language.
- Added Fortran and Fortran90 syntax-coloring and snippets support.
- Clicking on LeoInteg's status bar indicator now shows the log pane.
- Added support for "@rclick" nodes along "@button" nodes, by presenting a menu if they are present when clicking one.
- Copy paste from/to anywhere! Clipboard operations are now using the system's clipboard instead of Leo's internal clipboard. (Requires Leo minimal version of at least 6.6-b2)
- Removed LeoBridge server output pane: The server and 'Print' terminal outputs from leo now appears in the log pane.
- Headlines can now be changed to an empty string, as per Leo's standards.

## 1.0.5

- Fixed bug where the selection could not change (visual update in outline) when hoisted on a node deeper than top-level of tree (sibling of root node).

## 1.0.4

- Fixed typos and small bugs.
- Fixed refresh type for mark/unmark node.
- Fixed bug that prevented context some menu items on \@\<files\> nodes and other special nodes.
- Added Write (dirty) \@\<file\> commands and keybindings.
- Fixed flags and icons shown above the body pane for hoist/dehoist commands.
- Fixed 'clean/dirty' state of leo body documents with the 'triggerBodySave' method which makes sure the body text is sent to the leo server before anything would close or destroy the body pane. (when focusing on another document or outside of vscode, etc.)
- Fixed "view welcome-content" of outline for contexts before the bridge is connected, and settings were changed. (e.g. when auto start and/or auto-connect were off at startup)
- Fixed Leo's comment/code blocks directives "@doc"/"@code" and their shorthand versions "@"/"@c".
- Fixed color syntax to match Leo's PR #2303 which removes @raw and @end_raw and adds @section-delims.

## 1.0.3

- Fixed 'F3' bug: findNext didn't trigger because the context was not (re)set properly on focus-out from the 'find panel'.
- Changed all context 'when' clauses to be more 'precise & unique' in relation to other extensions, such as leojs.
- Added the reStructuredText (rest) .rst language support. (syntax coloring and snippets)
- Fixed at-button panel to refresh after adding a button
- Added 'Goto Script' command to the context menu of at-buttons, to 'find and goto' the source node of the button script.

## 1.0.2

- Cleaned up command palette's insert 'child' choices.
- Fixed 'insert node' command to insert as child if the targeted (or current) node is expanded.

## 1.0.1

- Fixed double check for vscode settings recommendations at startup.

## 1.0.0

- Fixed 'body-undo-modification-bug' when triggering outline icon change before undoing.
- Version 1.0, First Official Release!

## 0.1.20

- Added .leojs JSON file format support.
- Fixed various smaller/invisible bugs.

## 0.1.19

- Fixed 'tab' press from the sidebar: if pressing from the outline it tabs to possible icons on the node, then goes to the body pane. If pressed from the search panel, it cycles through the fields of the search panel.
- Made the server output channel and the Leo Log Window not show up and open automatically anymore unless the text in the Log Window is 'red' (For Errors to be shown).
- Added icon for the 'show Log Pane' command and made it available, along with the 'Show Leointeg Settings', on title bar of documents and buttons views.
- Automatic detection of VSCode's workbench.editor.closeOnFileDelete if its missing/disabled.
- Fixed pressing shift+insert while in terminal, which triggered the 'insert node' command instead of letting the usual vscode 'paste in terminal' command take effect.

## 0.1.18

- Git-diff is now fixed in Leo so the experimental option 'Set CWD' has been removed
- The somewhat unnecessary experimental option 'Shell' has been removed.
- Automatic detection of VSCode's workbench.editor.enablePreview if its missing/disabled.
- Automatic detection of VSCode's workbench.editor.closeEmptyGroups if its missing/enabled.
- Easier access to the leo settings through the extension config title strings and the extension view menu.

## 0.1.17

- Saves recently opened Leo files list per workspace, instead of globally.
- Changed the default visible command icons above the body pane. Also makes sure 'settings' is visible.
- Added global zoom level and editor font-size in the LeoInteg settings panel to help change the body & outline font sizes.
- Server now opens modal dialogs for saving dirty documents on exit.
- Added experimental server option settings (cwd, shell, detach) to help with various python setups.
- Server now started with a CWD of the current workspace by default (fixes git-diff).

## 0.1.16

- Added procedures to cleanup when closing a vscode window. (closes server and body panes)

## 0.1.15

- Modified server location logic
- Fixed find-prev, next, find all / clone-find commands
- Fixed extract name command.
- Fixed body being re-written to same string and being marked dirty when 'safety-saving' before switching docs.
- Detection of .Leo documents themselves now works by closing and re-opening the .leo file if reloading is chosen by the user. (or automatic via options)
- Added icons and commands for top of body pane menu.
- Added new commands such as insert-child along with their keybindings.
- Also added more keybindings to the 'insert-node' command such as 'insert' and 'shift-insert'.
- Added find-var and find-def commands.
- Made some text-related commands available through the right-click context menu in the body pane. (extract, find-var, find-def, etc.)

## 0.1.14

- Rewrite of the leobridgeserver script to be made compatible with the standards in leoserver script from Leo.
- Added option for specifying server file and path. Defaults to the internal leobridgeserver server script.
- Fixed cursor position and selection bugs.
- Fixed automatic server startup and connection bugs.
- Added Search functionality along with a 'find' panel.
- Added goto global line and other clone-find related commands from Leo's 'Search' menu.
- Added import-file(s) command - an alias of the import-any-file command form Leo.
- Temporary fix for some minibuffer commands to override the widgets interactions (ex. clone-find-all, etc.)
- Undo and redo icons are now faded out instead of disappearing when unavailable - to help with button shifting when clicking rapidly.
- Many other small bugfixes.

## 0.1.13

- Added support for precise focus placement, focus switch between tree/body.
- Made the extension more aware of the current selection state, to have strictly relevant buttons visible shown only.
- Made the 'edit headline' hover icon removable, in order to enable 'Tab' keybinding to go from tree to body directly.
- Added commands and keybindings for 'goto' operations 'hoist/dehoist' [#25](https://github.com/boltex/leointeg/issues/25) and other commands. [#30](https://github.com/boltex/leointeg/issues/30)
- Added support for Leo-Style outline navigation. [#43](https://github.com/boltex/leointeg/issues/43) Has to be enabled with an option in the config settings: "Use Leo Tree Browsing" which makes the arrow keys, pgUp/pgDn, home/end move the selection instead of a cursor when focus is on Leo's outline.
- Implemented @buttons in it's own panel, visible where the already existing 'outline' and 'opened leo documents' panels reside.
- Added (basic) unknown attributes support as hover tooltip and small description on node headlines.
- Added a 'leoBridge Server Terminal Panel' to gather output of the leoBridge stdOut pipe. It's displayed among the 'output panels', along with the standard 'leo log window', when the server is started by leoInteg. (either with the auto-start config setting, or by calling the 'start server' command via buttons or the command-palette.)
- Syntax coloring and Snippets are now enabled for those languages : C, C++, CSS, HTML, Java, Javascript, json, Markdown, PHP, Python, Rust and Typescript. They are taken from the default extension for that language, or if non-existent, from the most popular extension for that language
- Recent files are now remembered and restored upon re-opening vscode.
- Leo files can be opened from the explorer pane directly.
- Added 'minibuffer' feature with the usual alt-x command from Leo.
- Added cursor position, selected range and scrolling position to be captured and restored when navigating the outline. [#39](https://github.com/boltex/leointeg/issues/39) This allows for commands that use the currently selected text, [#61](https://github.com/boltex/leointeg/issues/61) such as run script and extract/extract name, etc.
- Redid the body display and switching logic to support new vscode API features. (vscode now does not block 'undo' operations between file-rename operations, which were used to switch body pane content.)

## 0.1.12

- Added support for multiple opened files along with the 'new', 'Close', 'Save-As' commands.
- Improved the icons and commands, which are visible, or invisible depending on context.
- Added 'tree view' listing the opened Leo documents which is available in the Leo view, and the explorer view.
- Added basic leonine syntax coloring. (No specific \@languages yet)
- Added selection support to the 'Execute-Script' command.

## 0.1.11

- Fixed undo operation for the _insert_ and _rename_ commands (Some other commands may still need fixes to their 'undo' support)
- Fixed crashing when editing body pane under Leo 6.2.

## 0.1.10

- Added more [welcome content](https://code.visualstudio.com/api/extension-guides/tree-view#welcome-content) in outlines panes that have not yet opened a tree for starting a server, connecting to it, and added content to help with automation settings.
- Changed the starting default configuration setting for starting and connecting to the leoBridge server script to false.
- Made starting and connecting to the leoBridge server script easier to access in the interface, and in the welcome/settings webview.
- Added new CONTRIBUTING markdown file for running the development version of the leoInteg extension.
- Closes [#44](https://github.com/boltex/leointeg/issues/44).

## 0.1.9

- Added new compilation configuration (server, extension, or both) to help debugging.
- Support async output from leoBridge, for log pane and other events.
- External file change detection with modal dialogs matching Leo's gui dialogs.
- Added config options to bypass derived files change detection dialogs with defaults, allowing automatic synchronization of derived files in both directions.
- Added support for redo, refresh from disk and many any other core Leo commands and operations.
- Added support for rapid outline edition command entry, including 'insert node' command **`Ctrl+I`** and for replacing focus on relevant elements to mimic actual Leo interface workflow.
- Added [welcome content](https://code.visualstudio.com/api/extension-guides/tree-view#welcome-content) in outlines panes that have not yet opened a tree to help with connecting and opening.
- Replaced body-editor content transfer logic and removed the related option in the expansion's settings. The body is sent to Leo when appropriate without need of a timed delay.
- _REMOVED FEATURE_ Rolled back 'multi-body' feature for simultaneous body panes from different gnx. Body panes from the same gnx are still available.

## 0.1.8

- Extension now built with webpack. [As recommended by vsCode's extension guidelines](https://code.visualstudio.com/api/working-with-extensions/bundling-extension#using-webpack)
- Added a 'Welcome Screen' webview (also compiled by webpack from html, scss and ts files) to show a greeting with basic info, and provide an easy way to change the configuration settings.
- Added commands accessible via either tree menu, context menu, and 'standard' Leo keyboard shortcuts:
  - Insert, delete
  - Cut/Copy/Paste/Clone/Paste as clone
  - Move, promote, demote node operations
  - Mark, unmark, sort children, sort siblings and undo

## 0.1.7

- Changed main mode of communication from stdin/out to tcp/ip websockets.
- Made a standalone 'Leo Server' python script.

## 0.1.6

- Major 'Browsing' update before adding outline editing and file saving & derivation (Thanks for testing!)
- Refactored and simplified communication between vscode and leoBridge.
- Stabilized browsing with multiple simultaneous body panes.
- Added Leo Outline into explorer view.
- Supports new command to open a node on the side from the context menu.
- Multiple configuration options: Open Settings with CTRL+',' type 'leo', or look for 'leo integration' in extensions.

_Note: Headline and body edition does not affect the Leo file yet._

## 0.1.5

- Stabilized tree browsing, along with headline and body editing.

## 0.1.4

- Major Refactor to streamline codebase; Eliminated code duplication.
- Complete rewrite after going trying out most of what is possible with both vscode and leo APIs.
- New body pane system that prevents corrupting undos across different positions: It uses the node's actual gnx instead of a generic "body" string as a file path for the custom filesystem.

## 0.1.3

- This version creates a body panel via a custom filesystem: 'leo'. It only has a file, "leo:/body", the body of the currently selected node.

_Note: This editable body panel does not affect Leo file yet._

## 0.1.2

- Prototype Goal Achieved!
- Browsing Now shows body text too, just like browsing in Leo without editing body nor headlines. (read only for now)

## 0.1.1

- Leo File Opening.
- Basic outline browsing, along with the recognizable node icons.

## 0.0.1

- Initial basic skeleton of this extension. Press F5 to view icon and test the startup of the extension!
- Implemented [leoBridge](https://leo-editor.github.io/leo-editor/leoBridge.html) interaction.

![LeoEditor](https://raw.githubusercontent.com/boltex/leointeg/master/resources/leoapp96px.png)
