function testWebview() {
  console.log("dude in test.js");
}
testWebview();

// This script will be run within the webview itself

// (function() {
//   console.log("init tests");
//   const vscode = acquireVsCodeApi();

//   function testWebview2() {
//     console.log("dude2");
//   }
//   testWebview2();

//   const oldState = vscode.getState();

//   const counter = document.getElementById("lines-of-code-counter");
//   console.log(oldState);
//   let currentCount = (oldState && oldState.count) || 0;
//   counter.textContent = currentCount;

//   setInterval(() => {
//     counter.textContent = currentCount++;

//     // Update state
//     vscode.setState({ count: currentCount });

//     // Alert the extension when the cat introduces a bug
//     if (Math.random() < Math.min(0.001 * currentCount, 0.05)) {
//       // Send a message back to the extension
//       vscode.postMessage({
//         command: "alert",
//         text: "🐛  on line " + currentCount
//       });
//     }
//   }, 300);

//   // Handle messages sent from the extension to the webview
//   window.addEventListener("message", event => {
//     const message = event.data; // The json data that the extension sent
//     switch (message.command) {
//       case "test":
//         console.log("got test message");
//         break;
//       default:
//         console.log("got message: ", message.command);
//     }
//   });
// })();
