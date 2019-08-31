# leointeg README

Leo editor integration with Visual Studio Code.

See Leo, the Literate Editor with Outline at: https://leoeditor.com/

![Screenshot](resources/screenshot1.png)

## Features

_As a starting point, here are a couple of intended features:_

Integration done with a python script. It interacts with leo via 'leoBridge'. (see https://leoeditor.com/leoBridge.html)

A 'view container' with its own icon in the activitybar. It's provided view is the actual outline of a leo file.

When in this 'leo-integration' mode, the functionality of vscode is altered to suit the interactions with the opened leo file. (For example: by re-maping shortcut keys to the familiar tree-editing shortcut keys of Leo.)

An appropriate editor on the right side, acting as the body pane.

2 way synchronisation of leo's output files and vscode's explorer & 'normal mode' of operation.

Go-to appropriate line in generated files. (Reproducing xcc-nodes behaviour see http://xccnode.sourceforge.net/)

File generating 'at' nodes that show their derived line number instead of the body-pane's line number (Also reproducing xcc-nodes behaviour)

more to be added...

## Requirements

- Leo installed
- Leo's path made available in \$PYTHONPATH

(Needed so python imports work. e.g. `import leo.core.leoBridge as leoBridge` )

## Extension Settings

None for now.

There will be settings for communicating either locally, via stdIn/out, and remotely over tcp, through a rest api or websockets. (communication consists of simple JSON data)

There will also be graphic-related settings such as light/dark theme and icon set selection

---

![Leo Editor](resources/background.jpg)
**Enjoy!**
