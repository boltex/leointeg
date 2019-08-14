# leointeg README

Leo Editor Integration with Visual Studio Code.

See Leo, the Literate Editor with Outline at: https://leoeditor.com/

## Features

_As a starting point, here are a couple of intended features:_

Integration done with a python script. It interacts with leo via 'leoBridge'.

A 'view container' with its own icon in the activitybar. It's only view is the outline of a leo file. (see https://leoeditor.com/leoBridge.html)

When in this 'leo-integration' mode, the functionality of vscode is altered to suit the interactions with the opened leo file.

An appropriate editor on the right acting as the body pane.

2 way synchronisation of leo's output files and vscode's explorer & 'normal mode' of operation.

more to be added...

## Requirements

- Leo installed
- Leo's path made available in \$PYTHONPATH

(So that python imports work. e.g. `import leo.core.leoBridge as leoBridge` )

## Extension Settings

None for now.

## Release Notes

Here's the progress so far...

### 0.0.1

Initial basic skeleton of this extension. Press F5 to view icon and test the startup of the extension!

### 1.0.1

commit & push comming soon :)

---

![Leo Editor](resources/background.jpg)
**Enjoy!**
