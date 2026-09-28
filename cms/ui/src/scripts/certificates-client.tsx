import React from "react";
import { createRoot, type Root } from "react-dom/client";
import CertificatesView from "../components/CertificatesView";

let activeRoot: Root | null = null;

function render() {
  const main = document.getElementById("main-content");
  if (!main) return;
  unmount();
  main.innerHTML = '<div id="react-certificates-root"></div>';
  const target = document.getElementById("react-certificates-root");
  if (!target) return;
  activeRoot = createRoot(target);
  activeRoot.render(<CertificatesView icons={window.App.icons} />);
}

function unmount() {
  if (activeRoot) {
    activeRoot.unmount();
    activeRoot = null;
  }
}

export function registerCertificatesRenderer() {
  window.CMSCertificates = { render, unmount };
}
