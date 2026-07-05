//todo:::
// connection test / block
// migration to tempo + time based synchronization
// count-in
// shoutouts actually good.
//
// optional
// automatically listen to als file changes (instead of having to manually F5 the project)
// add midi keyboard shortcuts
// redesign ui
// loop follows when you move sections
// set project time signatures based on scene


import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
