import Docker from "dockerode";

// On Windows with Bun runtime, Docker daemon must be exposed on TCP 2375 or run with Node.js (tsx/node)
const isBunOnWindows = process.platform === "win32" && typeof (process.versions as any).bun !== "undefined";

export const docker = isBunOnWindows
    ? new Docker({ host: "127.0.0.1", port: 2375 })
    : new Docker();