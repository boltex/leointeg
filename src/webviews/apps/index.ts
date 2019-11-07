interface VsCodeApi {
    postMessage(msg: {}): void;
    setState(state: {}): void;
    getState(): { [key: string]: any };
}

declare function acquireVsCodeApi(): VsCodeApi;

function testWebview() {
    console.log("dude");
}
testWebview();

// This script will be run within the webview itself
(function () {
    console.log("init tests");
    const vscode = acquireVsCodeApi();

    const oldState = vscode.getState();

    const counter = document.getElementById("lines-of-code-counter");
    console.log(oldState);
    let currentCount: number = (oldState && oldState.count) || 0;
    if (counter) {


        counter.textContent = currentCount.toString();

        setInterval(() => {
            counter.textContent = (currentCount++).toString();

            // Update state
            vscode.setState({ count: currentCount });

            // Alert the extension when the cat introduces a bug
            if (Math.random() < Math.min(0.001 * currentCount, 0.05)) {
                // Send a message back to the extension
                vscode.postMessage({
                    command: "alert",
                    text: "🐛  on line " + currentCount
                });
            }
        }, 300);
    }
    // Handle messages sent from the extension to the webview
    window.addEventListener("message", event => {
        const message = event.data; // The json data that the extension sent
        switch (message.command) {
            case "test":
                console.log("got test message");
                break;
            default:
                console.log("got message: ", message.command);
        }
    });
})();
