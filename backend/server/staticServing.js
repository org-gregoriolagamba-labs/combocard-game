import express from "express";
import path from "path";
import fs from "fs";

export function setupStaticServing(app) {
  const candidateFrontendBuildPaths = [
    path.join(process.cwd(), "frontend", "build"),
    path.join(process.cwd(), "..", "frontend", "build"),
    path.join(process.cwd(), "backend", "frontend", "build"),
  ];

  const candidateBackendPublicPaths = [
    path.join(process.cwd(), "backend", "public"),
    path.join(process.cwd(), "public"),
    path.join(process.cwd(), "..", "backend", "public"),
  ];

  let served = false;
  for (const fb of candidateFrontendBuildPaths) {
    if (fs.existsSync(fb)) {
      app.use(express.static(fb));
      app.get("/", (req, res) => res.sendFile(path.join(fb, "index.html")));
      served = true;
      console.log(`Serving frontend from ${fb}`);
      break;
    }
  }

  if (!served) {
    for (const bp of candidateBackendPublicPaths) {
      if (fs.existsSync(bp)) {
        app.use(express.static(bp));
        app.get("/", (req, res) => res.sendFile(path.join(bp, "index.html")));
        served = true;
        console.log(`Serving backend public from ${bp}`);
        break;
      }
    }
  }

  if (!served) {
    app.get("/", (req, res) => {
      res.send("Backend running. Build frontend separately during development.");
    });
  }
}