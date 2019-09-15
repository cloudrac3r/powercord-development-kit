const {Plugin} = require("powercord/entities")
const webpack = require("powercord/webpack")
const {getModuleByDisplayName, getModule, getAllModules} = webpack
const util = require("powercord/util")
const {getOwnerInstance} = require("powercord/util")
const {inject, uninject} = require("powercord/injector")

function copyProperties(source, target) {
	for (let i in source) {
		target[i] = source[i]
	}
}

module.exports = class DevelopmentKit extends Plugin {
	constructor() {
		super()
	}

	log(inputIcon, inputColor, message) {
		const icons = {
			v: "✅",
			x: "❎",
			sw: "⏱"
		}
		let icon = icons[inputIcon]
		if (!icon) return
		const colors = {
			green: "#2a2",
			red: "#f33"
		}
		let color = colors[inputColor] ? "color: "+colors[inputColor] : ""
		let currentTime = new Date().toTimeString().slice(0, 8)
		console.log(`%c[PDK ${currentTime}] %c${icon}`, "color: #4A83C9", color, "|", message)
	}

	startPlugin() {
		window.pdk = {
			$: this.wrap.bind(this, "querySelector"),
			powercord,
			webpack,
			util,
			getModuleByDisplayName: this.getModuleByDisplayName.bind(this),
			getModule: this.getModule.bind(this),
			getAllModules,
			getOwnerInstance,
			inject,
			uninject,
			injectConsoleLog: this.wrap.bind(this, "injectConsoleLog"),
			setTarget: this.wrap.bind(this, "setTarget"),
			reload: this.wrap.bind(this, "reloadTarget"),
			diffJSON: this.wrap.bind(this, "diffJSON"),
			debugger: this.wrap.bind(this, "debugger"),
			presets: {}
		}

		this._keydown.bound = this._keydown.bind(this)
		document.addEventListener("keydown", this._keydown.bound)

		window.pdk.presets.channels = {}
		copyProperties(webpack.channels, window.pdk.presets.channels)
		getModule(["getChannel"]).then(result => copyProperties(result, window.pdk.presets.channels))
		getModule(["selectChannel"]).then(result => copyProperties(result, window.pdk.presets.channels))
		getModuleByDisplayName("Channels").then(result => window.pdk.presets.channels.Channels = result)
		getModuleByDisplayName("ChannelItem").then(result => window.pdk.presets.channels.ChannelItem = result)

		this.hasInjectedConsoleLog = false
	}

	pluginWillUnload() {
		document.removeEventListener("keydown", this._keydown.bound)
	}

	wrap(name) {
		let args = [...arguments].slice(1)
		this[name](...args)
		return ""
	}

	setTarget(target) {
		if (!powercord.pluginManager.get(target)) {
			this.log("x", "red", "Target is not available in powercord.pluginManager")
		} else {
			this.settings.set("target", target)
			this.log("v", "green", "Target set: "+target)
		}
	}

	reloadTarget(target) {
		if (!target) target = this.settings.get("target")
		if (!target) {
			this.log("x", "red", "No target set. Pass an argument, or use `pdk.setTarget` first.")
		} else if (!powercord.pluginManager.get(target)) {
			this.log("x", "red", "Target is not found in powercord.pluginManager")
		} else {
			this.log("sw", "", "Reloading "+target+"...")
			powercord.pluginManager.remount(target).then(() => {
				this.log("v", "green", "Reloaded  "+target+".")
			})
		}
	}

	getModule(filter, retry = false) {
		if (typeof(filter) == "string") filter = [filter]
		let promise = Promise.resolve(getModule(filter, retry))
		promise.then(result => {
			window.pdk.last = result
			if (result) {
				this.log("v", "green", "Sent to next line")
				console.log(result)
			} else {
				this.log("x", "red", result)
			}
		})
		return promise
	}

	getModuleByDisplayName(filter, retry = false) {
		let promise = Promise.resolve(getModuleByDisplayName(filter, retry))
		promise.then(result => {
			window.pdk.last = result
			if (result) {
				this.log("v", "green", "Sent to next line")
				console.log({f: result})
			} else {
				this.log("x", "red", result)
			}
		})
		return promise
	}

	_keydown(event) {
		if (event.key == "r" && event.altKey) {
			if (event.ctrlKey) {
				this.reloadTarget(this.pluginID)
			} else {
				this.reloadTarget()
			}
		} else if (event.key == "F8") {
			debugger
		}
	}

	diffJSON(o1, o2) {
		let report = this._diffObjects(o1, o2, [], [])
		if (report) {
			this.log("v", "green", "Sent to next line\n"+report)
		} else {
			this.log("v", "green", "No differences.")
		}
	}

	_diffObjects(o1, o2, prefix, stack) {
		let ps = prefix.join(".")+"."
		let report = ""
		let keys1 = Object.keys(o1)
		let keys2 = Object.keys(o2)
		keys2.forEach(key => {
			if (!keys1.includes(key)) report += `1.${ps}${key} is missing from 2\n`
		})
		keys1.forEach(key => {
			if (!keys2.includes(key)) report += `2.${ps}${key} is missing from 1\n`
		})
		let sharedKeys = keys1.filter(key => keys2.includes(key))
		if (sharedKeys.length < (keys1.length+keys2.length)*0.3) {
			report += `.${ps} have very different key names (< 30% match)\n`
		} else {
			sharedKeys.forEach(key => {
				let p1 = o1[key]
				let p2 = o2[key]
				if (typeof p1 != typeof p2) {
					let equality = p1 == p2 ? " (but values are still loosely equal)" : ""
					report += `.${ps}${key} types differ, 1 is ${typeof p1}, 2 is ${typeof p2}${equality}\n`
				} else if (typeof p1 == "function") {
					if (p1 !== p2) report += `.${ps}${key} are different function references, named "${p1.name}" and "${p2.name}"\n`
				} else if (typeof p1 == "object") {
					if (p1 != p2) {
						if (p1 === null) {
							report += `1.${ps}${key} is null, 2 is other object\n`
						} else if (p2 === null) {
							report += `2.${ps}${key} is null, 1 is other object\n`
						} else {
							if (!stack.includes(p1) && !stack.includes(p2)) {
								stack.push(p1, p2)
								report += this._diffObjects(p1, p2, prefix.concat([key]), stack)
							}
						}
					}
				} else if (typeof p1 == "number" || typeof p1 == "string" || typeof p1 == "boolean" || typeof p1 == "symbol") {
					if (p1 !== p2) report += `.${ps}${key} differ: values are "${p1}" and "${p2}" (both type ${typeof p1})\n`
				} else {
					report += `.${ps}${key} unknown type ${typeof p1}`
				}
			})
		}
		return report
	}

	querySelector(target) {
		let result = document.querySelector(target)
		this.log("v", "green", result)
	}

	injectConsoleLog(object, key) {
		if (this.hasInjectedConsoleLog) {
			uninject("pdk-consolelog")
			this.log("v", "green", "Previous injection removed.")
		}
		if (object && key) {
			this.hasInjectedConsoleLog = true
			inject("pdk-consolelog", object, key, (_, res) => {
				console.log(res)
				return res
			})
			this.log("v", "green", "Injection added.")
		}
	}

	debugger(time = 3e3) {
		const callback = () => {
			this.log("v", "green", "Debugger activated.")
			debugger
		}
		if (time > 0) {
			this.log("sw", "", "Debugger timeout set for "+(time/1000)+" seconds")
			setTimeout(callback, time)
		} else {
			callback()
		}
	}
}
