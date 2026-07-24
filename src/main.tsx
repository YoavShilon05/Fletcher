//todo::
// migrate chart to mscz
// chart zoom in / out buttons
// chart choose instruments to show
// auto share chart on lan
// allow upload of chart files locally
// midi controls for:
// - next / prev song
// shoutouts actually good.
//
//
// optional
// automatically listen to als file changes (instead of having to manually F5 the project)
// count-in
// add midi keyboard shortcuts
// loop follows when you move sections


import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
