# Powercord development kit

This plugin is for my personal use. I will break things as I see fit. If you find it useful, feel free to use it yourself.

## Basics

All data is accessible through the global variable `pdk`, which was set using `window.pdk`.

## Basic properties

Property|Comment
-|-
`powercord`|Same as the global variable `powercord`
`webpack`|Shortcut to `require("powercord/webpack")`
`util`|Shortcut to `require("powercord/util")`
`getAllModules(...)`|Same as `webpack.getAllModules`
`getOwnerInstance(element)`|Same as `util.getOwnerInstance`
`inject(...)`|Same as `injector.inject`
`uninject(...)`|Same as `injector.uninject`
`presets`|Holds presets. See below.

## Advanced wrappers

Property|Comment
-|-
`getModuleByDisplayName(filter, retry?)`|Make 1 attempt to get the module and send the result to the console. Set `retry` to `true` to make multiple attempts (slow).
`getModule(filter, retry?)`|Similar to above. `filter` is a string, not an array of strings.
`last`|Holds the data from the previously fetched module
`injectConsoleLog(object?, key)`|Injects a `console.log` into that function. Designed for React's component render. Only injects into one thing at a time. Use with no arguments to remove the previous injection.
`debugger(time?)`|Trigger the Chrome debugger after that number of milliseconds. Default is 3000 ms.
`setTarget(pluginID)`|Set the name of the plugin you're currently developing to enable quick reloads for it.
`reload(pluginID?)`|Reload a plugin. If you don't specify an ID, it will use the ID that you used previously in `setTarget`.
`diffJSON(obj1, obj2)`|Summarise the differences between two JSON objects.

## Keybinds

Key|Comment
-|-
`Alt-R`|Reloads the targeted plugin.
`Ctrl-Alt-R`|Reloads `powercord-development-kit`.
`F8`|Activates the Chrome debugger.

## Presets

Presets are amalgamations of related functions collected from different places throughout Powercord.

### `presets.channels`

Collects properties from `webpack.channels`, the `getChannel` module, the `selectChannel` module, as well as the `Channels` component and the `ChannelItem` component.
