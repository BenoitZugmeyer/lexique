"use strict";

let Server = require("node-static").Server;
let http = require("http");
let temp = require("temp").track();
let watch = require("./build").watch;

function serve(rootPath) {
  var fileServer = new Server(rootPath);

  http.createServer(function (request, response) {
    request.addListener("end", function () {
      fileServer.serve(request, response);
    }).resume();
  }).listen(8080);

  console.log(`Listening to http://localhost:8080`);
}

function mktemp() {
  return new Promise((resolve, reject) => {
    temp.mkdir("lexique", (err, path) => {
      if (err) reject(err);
      else resolve(path);
    });
  });
}


module.exports = {

  help: `
lexique serve [-d] [DATABASE.yml]

Create a HTTP server to quickly generate and test the lexic.

  -d : development mode
  `,

  shortHelp: `Create a HTTP server`,

  args: { boolean: [ "d" ] },

  run(options) {
    return mktemp().then((outputPath) => {
      Promise.all([serve(outputPath), watch({
        dataPath: options.argv._[0],
        outputPath,
        development: options.argv.d,
      })]);
    });
  }

};

