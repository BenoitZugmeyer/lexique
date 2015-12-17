#!/usr/bin/env node
"use strict";
/*eslint no-console: 0*/

let minimist = require("minimist");
let fs = require("fs");
let path = require("path");

let commands = new Map();
let commandsPath = path.join(__dirname, "commands");
for (let commandPath of fs.readdirSync(commandsPath)) {
  if (commandPath.endsWith(".js")) {
    commands.set(path.basename(commandPath, ".js"), require(path.join(commandsPath, commandPath)));
  }
}

let commandName = process.argv[2];
if (!commands.has(commandName)) commandName = "help";

let command = commands.get(commandName);

let argv = minimist(process.argv.slice(3), command.args || {});

Promise.resolve(command.run({ argv, commands }))
.catch((error) => {
  console.log(error.stack || error);
  process.exit(1);
});
