# How to install and run the development version

Thanks for trying out the development version of LeoInteg! :sunglasses: Contributions and pull requests are more than welcome!

## Introduction

If you're new to vscode and want to try out Leo with this vscode extension, you might want to look at this [Getting Started](https://code.visualstudio.com/docs#vscode-in-action) page to get an overview.

Furthermore, if you've never ran a vscode extension in an **Extension Development Host**, here is a [short overview about running and modifying a simple extension](https://code.visualstudio.com/api/get-started/your-first-extension).

If you're having problems with the procedures below, try [running this sample extension](https://github.com/Microsoft/vscode-extension-samples/tree/master/helloworld-sample#running-the-sample) first to catch underlying problems or missing dependencies.

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

- With vscode now opened with the **leoInteg folder as its workspace**, use the `ctrl+shift+p` keyboard shortcut to open command palette and toggle the terminal. (You can find any command through the command palette)

![open terminal](resources/open-terminal.png)

- Install the development dependencies by entering the `npm install` command in the terminal. **(Important if you also just _pulled_ updated sources)**

- When the command has finished running, you should see logged results in the terminal and also that a new **node_modules** folder was created.

![dependencies](resources/node-modules.png)

- You're now ready to **compile and run** the development version of the leoInteg extension.

## Choosing a debug profile

- Bring up the **Run view**, by selecting the Run icon in the **Activity Bar**. _(Screenshot below)_

- When simply running the extension, choose the **Run Extension** profile.

![profile](resources/debug-profile.png)

> (**Optional**) To contribute code to the python server script, or run it through the vscode debugger, you may need to install the [python development extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python).

- For simply running and using leoInteg, just start the extension and the server as shown below.

## Starting the extension

- Use the **Start Debugging** command (or press **F5**) to start another vscode window with the expansion _installed and running_ within it.

![extension started](resources/leointeg-started.png)

- If any problems occurred during the extension compilation it will be logged in the vscode instance that started the debug process in its **task-webpack** terminal panel. Otherwise if its running, the extension itself will be logging any messages in the **debug-console** panel. (See animation below)

![extension logs](resources/debug-anim.gif)

## The python server script

- This extension needs the **`leobridgeserver.py`** script to be running. That is where the two extra extension requirements come into play: Having [Leo's path made available in the \$PYTHONPATH environment variable](https://github.com/leo-editor/leo-editor/blob/master/INSTALL.TXT#L126), and having the [Websocket Python Library installed](https://websockets.readthedocs.io/en/stable/intro.html)

### How to start the server script

- You can have LeoInteg try to start a server script instance itself via the **Start Leo Bridge Server** command or button. It will use the 'py' command on Windows and 'python3' command on other OSes by default. _You can automate this process via leoInteg's configuration settings._
- You can have vscode's **Debug View** start it as a debug session starts by choosing a debug profile that includes the server script. It's then possible to step in, inspect and debug the python server script. _The [python development extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python) may be required._
- You can also start it yourself manually, by running the leobridgeserver.py script from a command prompt.

### Using Anaconda or other custom python installations

- LeoInteg provides configuration options to specify how to launch python interpreter but this may not be enough to get it to start on your system, see [#10](https://github.com/boltex/leointeg/issues/10) and other issues relating to configurations in _sitecustomize.py_ file as noted in [Leo's google group forum](https://groups.google.com/d/msg/leo-editor/FAP8lVnWLyQ/lWHWEYH9AgAJ).

- If Leointeg or vscode cannot start running the server script on you system or OS, a **workaround** is to start the server script beforehand manually with whichever python interpreter you have installed.

![launch server](resources/manual-server-start.png)

- It will terminate automatically when a user disconnect.

**Note**: If force-closing the server from the integrated vscode terminal, use the 'Kill terminal' button instead of the 'X' that just hides the panel.

![kill terminal](resources/kill-terminal.png)

## Issues

More information can be found on the repository's [Issues Page](https://github.com/boltex/leointeg/issues), where details and troubleshooting can be addressed more directly.
