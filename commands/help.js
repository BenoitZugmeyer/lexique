"use strict";

function displayGlobalUsage(commands) {
  let commandNames = Array.from(commands.keys()).join("|");
  console.log(`lexique [${commandNames}] ...\n`);
  for (let entry of commands) {
    let name = entry[0];
    let command = entry[1];
    console.log(`  ${name}: ${command.shortHelp}`);
  }
}

function displayCommandUsage(command) {
  console.log(command.help.trim());
}

module.exports = {

  help: `
lexique help [COMMAND]

Display the help of a command and quit.
  `,

  shortHelp: `Display the help of a command`,

  run(options) {
    let command = options.commands.get(options.argv._[0]);
    if (!command) {
      displayGlobalUsage(options.commands);
    }
    else {
      displayCommandUsage(command);
    }
  }
};
