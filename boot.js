//Vars
let Debugging = true
//EngineBase
function debugSend(str) {
	if(Debugging) {
		console.log(`[DEBUG] | ${str}`)
	}
}
function print(...args) { //So I don't get confused why print() doesn't work
	console.log(...args)
}
//Keys
process.stdin.setRawMode(true)
process.stdin.resume()
process.stdin.setEncoding("utf-8")

process.stdin.on("data", (key) => {
	if (key == "q") {
		let errored = false
		try {
			process.stdin.pause()
    		process.stdin.removeAllListeners("data")
		} catch(err) {
			print("Failed to close server:",err)
		} finally {
			if (!errored) {
				print("Successfully closed server.")
			}
		}
	}
	if (key == "r") {
		let errored = false
		try {
			process.stdin.pause()
			print("Attempting to restart servers...")
		} catch(err) {
			errored = true
			print("Failed to restart:",err)
		} finally {
			if (!errored) {
				process.stdin.resume()
				print("Cleared Restart.")
			}
		}
	}
	if (key == "d") {
		print("Changing Debug Mode:",Debugging,">",!Debugging)
		Debugging = !Debugging
		print("Changed Debug Mode:",Debugging)
	}
})
print("A")
