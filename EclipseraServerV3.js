//EclipseraServerV3.js
const http = require("http");
const fs = require("fs");
const chokidar = require("chokidar")
const os = require("os");
const path = require("path");
const { fileURLToPath } = require("url");

//EngineBase
function getLocalIP() {
	const interfaces = os.networkInterfaces();
	for (const name in interfaces) {
		for (const iface of interfaces[name]) {
			if (iface.family === "IPv4" && !iface.internal) {
				return iface.address;
			}
		}
	}
	return "127.0.0.1"
}

function debugSend(str) {
	if(Debugging) {
		console.log(`[DEBUG] | ${str}`)
	}
}
function print(...args) { //So I don't get confused why print() doesn't work
	console.log(...args)
}


//Server Vars
const PORT=3000
let Debugging = true






//Keys
process.stdin.setRawMode(true)
process.stdin.resume()
process.stdin.setEncoding("utf-8")

process.stdin.on("data", (key) => {
	if (key == "q" && server.listening) {

	}
	if (key == "r" && server.listening) {

	}
	if (key == "d") {
		print("Changing Debug Mode:",Debugging,">",!Debugging)
		Debugging = !Debugging
		print("Changed Debug Mode:",Debugging)
	}
})
print("A")
