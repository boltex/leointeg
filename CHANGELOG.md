# Change Log

### 0.1.7

- Changed main mode of communication from stdin/out to tcp/ip websockets.
- Made a standalone 'Leo Server' python script.

### 0.1.6

- Major 'Browsing' update before adding outline editing and file saving & derivation (Thanks for testing!)
- Refactored and simplified communication between vscode and leoBridge.
- Stabilized browsing with multiple simultaneous body panes.
- Added Leo Outline into explorer view.
- Supports new command to open a node on the side from the context menu.
- Multiple configuration options: Open Settings with CTRL+',' type 'leo', or look for 'leo integration' in extensions.

_Note: Headline and body edition does not affect the Leo file yet._

### 0.1.5

- Stabilized for browsing, headline and body editing.

### 0.1.4

- Major Refactor to streamline codebase; Eliminated code duplication.
- Complete rewrite after going trying out most of what is possible with both vscode and leo APIs.
- New body pane system that prevents corrupting undos across different positions: It uses the node's actual gnx instead of a generic "body" string as a file path for the custom filesystem.

### 0.1.3

- This version creates a body panel via a custom filesystem: 'leo'. It only has a file, "leo:/body", the body of the currently selected node.

_Note: This editable body panel does not affect Leo file yet._

### 0.1.2

- Prototype Goal Achieved!
- Browsing Now shows body text too, just like browsing in Leo without editing body nor headlines. (read only for now)

### 0.1.1

- Leo File Opening.
- Basic outline browsing, along with the recognizable node icons.

### 0.0.1

- Initial basic skeleton of this extension. Press F5 to view icon and test the startup of the extension!

![LeoEditor](resources/leoapp96px.png)
