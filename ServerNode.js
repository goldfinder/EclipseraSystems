// EclipseraServer.js
const http = require("http");
const fs = require("fs");
const chokidar = require("chokidar")
const os = require("os");
const path = require("path");
const { fileURLToPath } = require("url");

class DiagnosticError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = this.constructor.name;
        this.timestamp = new Date();
        this.context = context;
        Error.captureStackTrace?.(this, this.constructor);
    }
}

//Server Vars
const PORT = 3000
let Debugging = true

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                // Usually returns something like 192.168.1.10
                return iface.address;
            }
        }
    }
    return "127.0.0.1"; // fallback
}

function DebugSend(ShowDebug, str) {
    if (ShowDebug) {
        console.log(`[DEBUG] | ${str}`)
    }
}

//Parse Cores
const Cores = {}
function ParseCore(coreFile, state) {
    if (!state || !coreFile) {
        DebugSend(Debugging, `Cannot create core for '${coreFile}'. (Err.InvalidVariables)`)
        return
    }
    const CoreName = path.basename(coreFile).split(" ", 1)[0].toLowerCase();
    switch (state.toLowerCase()) {
        case ("adddir"):
            if (Cores[CoreName]) {
                DebugSend(Debugging, `Cannot create core for '${coreFile} | ${CoreName}'. (Err.AlreadyExists)`)
                DebugSend(Debugging, "")
                DebugSend(Debugging, "")
                break
            }
            if (CoreName.startsWith("node_") || CoreName.startsWith("core_") || CoreName.startsWith("new")) {
                DebugSend(Debugging, `Cannot create core for '${coreFile} | ${CoreName}'. (Err.NameInvalid)`)
                DebugSend(Debugging, "")
                DebugSend(Debugging, "")
                break
            }
            Cores[CoreName] = {
                IsAvaliable: false
                , File: path.join(coreFile, "server.js")
                , Chokidar: chokidar.watch(coreFile, { depth: 0 }).on("all", (evt, f) => {
                    if (path.basename(f).toLowerCase() === "server.js" && Cores[CoreName]) {
                        if (["add", "change"].includes(evt)) {
                            try {
                                delete require.cache[require.resolve(Cores[CoreName].File)];
                            } catch { }
                            try {
                                require(Cores[CoreName].File)
                                Cores[CoreName].IsAvaliable = true
                                DebugSend(Debugging, `Reloaded core '${CoreName}'.`)
                            } catch (err) {
                                const errorType = err.name || "UnknownError";
                                const errorMessage = err.message || "No message";
                                const errorStack = err.stack ? `\nStack: ${err.stack}` : "";
                                DebugSend(
                                    Debugging, `Unable to reload core '${CoreName}': [${errorType}] ${errorMessage}${errorStack}`
                                );
                            }
                        }

                    }
                })
            }
            DebugSend(Debugging, `Created server for '${coreFile} | ${CoreName}'. (Success)`)
            DebugSend(Debugging, "")
            DebugSend(Debugging, "")
            break
        case ("unlinkdir"):
            if (!Cores[CoreName]) {
                DebugSend(Debugging, `Cannot remove core for '${coreFile} | ${CoreName}'. (Err.IsNotSet)`)
                DebugSend(Debugging, "")
                DebugSend(Debugging, "")
                break
            }
            Cores[CoreName].Chokidar.close()
            try {
                delete require.cache[require.resolve(Cores[CoreName].File)];
            } catch { }
            delete Cores[CoreName]
            DebugSend(Debugging, `Removed core '${coreFile} | ${CoreName}'. (Success)`)
            DebugSend(Debugging, "")
            DebugSend(Debugging, "")
            break
        default:
            DebugSend(Debugging, `Unknown state: '${state.toLowerCase()}'. (Err.InvalidState)`)
    }
}

let ChokidarFile = (__dirname).replace(/\//g, "\\");

const CD = chokidar.watch(ChokidarFile, { depth: 0, ignoreInitial: false });
DebugSend(Debugging, `watching path: ${ChokidarFile}`)
CD.on("all", (event, f) => {
    if (path.resolve(f) === path.resolve(ChokidarFile)) {
        DebugSend(Debugging, `Skipping main... [${event}] ${f}`)
        return
    }
    DebugSend(Debugging, `[${event}] ${f}`);
    ParseCore(f, event)
});

const serverIP = getLocalIP();
const server = http.createServer((req, res) => {
    const urlParts = req.url.split("?");
    let filePath = urlParts[0]
    const query = urlParts[1] || ""
    if (filePath.startsWith("/")) {
        filePath = filePath.slice(1); // Pre-Remove slash
    }
    const callerstate = (`${req.socket.remoteAddress}` === "::1" && "Localhost:Host" || `${req.socket.remoteAddress}` === "::::ffff:127.0.0.1" && "Localhost:Host" || `${req.socket.remoteAddress}`)
    DebugSend(Debugging, `[CALL] ${filePath} from ${callerstate}`)
    // Parse the whole HTTP request before considering anything else
    //Todo
    //Split everything and make it so CoreSite == 0, and FileName == .length()
    filePath = filePath.toLowerCase()
    let parts = filePath.split("/");
    let CoreSite = parts[0]
    let SubPath = parts.slice(1).join("/")
    let rest = filePath.split("/");
    if (CoreSite === "") {
        CoreSite = "core"
    }
    if (SubPath === "") {
        SubPath = "index.html"  // Replace empty sub paths with index
    }
    //Final Sanity Check
    SubPath = SubPath.toLowerCase()
    CoreSite = CoreSite.toLowerCase()
    filePath = filePath.toLowerCase()
    let FileName = rest.length > 0 ? "/" + rest.join("/") : "";
    //Traverse Parser
    if (SubPath.includes("../")) {
        res.writeHead(406);
        return res.end("Bad Request");
    }
    if (!filePath.endsWith("/") && (SubPath == "index" && parts.slice(1).join("/") == "") && !filePath == "") {
        const redirectUrl = filePath + "/" + (query ? "?" + query : "");
        DebugSend(Debugging, redirectUrl)
        res.writeHead(307, { "Location": redirectUrl });
        DebugSend(Debugging, "Redirecting user...")
        return res.end();
    }
    //Parse Core
    DebugSend(Debugging, `Full path: ${filePath || "/"}`);
    DebugSend(Debugging, `Core site: ${CoreSite}`);
    DebugSend(Debugging, `Sub path: ${SubPath}`);
    DebugSend(Debugging, `File Name: ${parts[parts.length] || "index.html"}`)
    DebugSend(Debugging, `Is Core: ${CoreSite == "core"}`)
    if (Cores[CoreSite] && Cores[CoreSite].IsAvaliable) {
        const rq = require(Cores[CoreSite].File)
        if (SubPath.toLowerCase().endsWith(".html")) {
            DebugSend(Debugging, "Code for coresite parsed correctly. (Success)")

            rq.ParseHTML(Debugging, SubPath, query).then(result => {
                if (result.Status === 404) {
                    return rq.Get404(Debugging).then(result => {
                        res.writeHead(result.Status);
                        return res.end(result.HTML);
                    })
                }
                if (result.Status === 307) {
                    DebugSend("Relocating to a diffrent site: ", result.HTML)
                    res.writeHead(307, { "Location": result.HTML });
                    return res.end();
                }
                res.writeHead(result.Status);
                return res.end(result.HTML);
                //let IsRedirect = false
                //if (result.HTML.split(":")[0] === "Redirect to") {
                //    let target = result.HTML.split(":")[1]?.trim() || "";
                //    if (target === "") target = "index.html";
                //    IsRedirect = target;
                //}
                //if (result.Status === 301) {
                //    
                //}
            })
        } else {
            rq.GetFile(Debugging, SubPath, query).then(result => {
                res.writeHead(result.Status);
                return res.end(result.HTML);
            })
        }
    } else if (Cores[CoreSite] && !Cores[CoreSite].IsAvaliable) {
        DebugSend(Debugging, "Code for coresite failed. (Err.NoCore)")
        res.writeHead(404)
        res.end("File unavaliable.")
    } else if (CoreSite == "favicon.ico") {
        const Ico = path.join(__dirname, "CoreIcon.png")
        fs.readFile(Ico, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end();
                return;
            }
            res.writeHead(200, { "Content-Type": "image/png" });
            res.end(data);
        });
    } else {
        DebugSend(Debugging, `User attempted to load bad core.  '${CoreSite}' (Err.NoCore)`)
        res.writeHead(400);
        res.end("Invalid CORE state.");
    }
    DebugSend(Debugging, "")
    DebugSend(Debugging, "")
})

server.listen(PORT, () => {
    DebugSend(Debugging, "-- DEBUGGING | NETWORKING --")
    DebugSend(Debugging, `Server running on:`);
    DebugSend(Debugging, ` - Local: localhost:${PORT}`);
    if (serverIP !== "127.0.0.1") {
        DebugSend(Debugging, ` - LAN:   ${serverIP}:${PORT}`);
    }
    DebugSend(Debugging, "")
    DebugSend(Debugging, "")
});

process.stdin.setRawMode(true)
process.stdin.resume()
process.stdin.setEncoding("utf-8")

process.stdin.on("data", (key) => {
    if (key == "q" && server.listening) {
        DebugSend(Debugging, "Closing server")
        try {
            server.close()
            DebugSend(Debugging, `Server closed`)
            process.stdin.pause()
            process.stdin.removeAllListeners("data")
            DebugSend(Debugging, `STDIN Closed`)
            CD.close()
            DebugSend(Debugging, `Closed watcher for: 'ServerWatcher'`)
            Object.entries(Cores).forEach(([coreName, core]) => {
                if (core?.Chokidar) {
                    core.Chokidar.close();
                    DebugSend(Debugging, `Closed watcher for: '${coreName}'`)
                }
            });
            //final
            DebugSend(Debugging, "Succeeded in closing.")
        } catch (err) {
            DebugSend(Debugging, `${err}`)
            DebugSend(Debugging, `Failed to close server.`)
        }
    }
    if (key == "d" && server.listening) {
        console.log("[DEBUG] | Toggling Debugging mode...")
        Debugging = !Debugging
        switch (Debugging) {
            case (true):
                console.log("[DEBUG] | Toggled On")
                break
            case (false):
                console.log("[DEBUG] | Toggled Off")
                break
        }
    }
})
