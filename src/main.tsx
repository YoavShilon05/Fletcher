//todo:::
// chord view
// auto scroll on chart view / chord view
// shoutouts
// auto file loading from project folder
// loop sections
// add python to git repo
//
// optional
// automatically listen to als file changes (instead of having to manually F5 the project)
// add midi keyboard shortcuts
// redesign ui


import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
