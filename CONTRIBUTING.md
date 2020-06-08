# How to install and run development version

## Development requirements

- Make sure you have Node.js and Git installed. Also check your Node.js and vscode versions by opening the 'about' dialog from the help menu in vscode. You should at least match or exceed the versions below.

![about](resources/vscode-about.png)

On Windows:

> Version: 1.45.1\
> Commit: 5763d909d5f12fe19f215cbfdd29a91c0fa9208a\
> Date: 2020-05-14T08:27:35.169Z\
> Electron: 7.2.4\
> Chrome: 78.0.3904.130\
> Node.js: 12.8.1\
> V8: 7.8.279.23-electron.0\
> OS: Windows_NT x64 10.0.17763

On Linux:

> Version: 1.45.1\
> Commit: 5763d909d5f12fe19f215cbfdd29a91c0fa9208a\
> Date: 2020-05-14T08:27:22.494Z\
> Electron: 7.2.4\
> Chrome: 78.0.3904.130\
> Node.js: 12.8.1\
> V8: 7.8.279.23-electron.0\
> OS: Linux x64 5.5.5-050505-generic

## Getting the source and its development dependencies

- Clone the repository using the command line by typing : `git clone https://github.com/boltex/leointeg.git`

![clone](resources/git-clone.png)

- Although you could 'cd' into the leoInteg folder and run some commands from the same terminal, let's instead use the terminal from within vscode. So open the leoInteg folder with vscode instead:

![open with vscode](resources/open-with-vscode.png)

- With vscode now opened with the leoInteg folder as its workspace, use the `ctrl+shift+p` keyboard shortcut to open command palette and toggle the terminal. (You can find any command through the command palette)

![open terminal](resources/open-terminal.png)

- Install the expansion's dependencies with by using the `npm install` command.

- When the command has finished running, you should see that a new **node_modules** folder was created.

![dependencies](resources/node-modules.png)

- You're now ready to run the development version of the leoInteg extension.

## Choosing a debug profile

- Bring up the Run view, by selecting the Run icon in the Activity Bar.\
  _Highlighted in the screenshot below_

- When simply running the extension, choose the 'extension' profile.

![profile](resources/debug-profile.png)

- If you want to contribute to the python server script and run it inside the vscode debugger, you will need to install the [python development extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python) and choose a debug profile that includes the server script.

## Starting the extension

- Press F5 (the 'Start Debugging' command) to start another vscode window with the expansion 'installed' and running in it.

## The python server script

- The leoInteg extension needs the leobridgeserver.py python script to be running.
