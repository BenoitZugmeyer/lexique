"use strict";
let webpack = require("webpack");
let path = require("path");
let HtmlWebpackPlugin = require("html-webpack-plugin")

const getPath = (fullPath) => {
  const args = fullPath.split("/");
  args.unshift("..");
  args.unshift(__dirname);
  return path.resolve(...args);
};

function compiler(options) {
  let config = {
    context: getPath("src"),
    entry: "./main",
    resolve: {
      alias: {
        data$: path.resolve(options.dataPath),
      }
    },
    output: {
      path: options.outputPath,
      filename: "main.js",
    },
    plugins: [
      new HtmlWebpackPlugin({
        hash: true,
        template: getPath("src/index.html"),
      }),
      new webpack.DefinePlugin({
        "process.env": {
          NODE_ENV: JSON.stringify(options.development ? "development" : "production"),
        },
      }),
    ],
    module: {
      loaders: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: "babel",
          query: {
            presets: ["es2015"]
          }
        }
      ]
    }
  };

  if (!options.development) {
    config.plugins.push(
      new webpack.optimize.OccurenceOrderPlugin(),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false,
        },
      })
    );
  }

  return webpack(config);
}

function run(fct) {
  return new Promise((resolve, reject) => {
    fct(function(err, stats) {
      if (err) reject(err);
      else {
        console.log(stats.toString({ colors: true }));
        resolve();
      }
    });
  });
}

module.exports = {

  help: `
lexique build [-d] [DATABASE.yml] [OUTPUT_DIRECTORY]

Build the lexic website based on the database file.

  -d : development mode
  `,

  shortHelp: `Build the website`,

  args: { boolean: [ "d" ] },

  run(options) {
    return run((cb) => compiler({
      dataPath: options.argv._[0],
      outputPath: options.argv._[1],
      development: options.argv.d,
    }).run(cb));
  },

  watch(options) {
    return run((cb) => compiler(options).watch({}, cb));
  }

};
