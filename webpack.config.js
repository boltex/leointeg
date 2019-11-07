//@ts-check

"use strict";
const fs = require("fs");
const path = require("path");

const glob = require("glob");
const { CleanWebpackPlugin: CleanPlugin } = require("clean-webpack-plugin");
const CspHtmlPlugin = require("csp-html-webpack-plugin");
const ForkTsCheckerPlugin = require("fork-ts-checker-webpack-plugin");
const HtmlExcludeAssetsPlugin = require("html-webpack-exclude-assets-plugin");
const HtmlPlugin = require("html-webpack-plugin");
const ImageminPlugin = require("imagemin-webpack-plugin").default;
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const clean = ["**/*"];

const cspPolicy = {
  "default-src": "'none'",
  "img-src": ["vscode-resource:", "https:", "data:"],
  "script-src": ["vscode-resource:", "'nonce-Z2l0bGVucy1ib290c3RyYXA='"],
  "style-src": ["vscode-resource:"]
};

const plugins = [
  new CleanPlugin({ cleanOnceBeforeBuildPatterns: clean }),
  new ForkTsCheckerPlugin({
    tsconfig: path.resolve(__dirname, "tsconfig.webviews.json"),
    async: false,
    eslint: true
  }),
  new MiniCssExtractPlugin({
    filename: "[name].css"
  }),
  new HtmlPlugin({
    excludeAssets: [/.+-styles\.js/],
    template: "index.html",
    filename: path.resolve(__dirname, "dist/webviews/settings.html"),
    inject: true,
    // inlineSource: env.production ? '.(js|css)$' : undefined,
    cspPlugin: {
      enabled: true,
      policy: cspPolicy,
      nonceEnabled: {
        "script-src": true,
        "style-src": true
      }
    },
    minify: true
      ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: false,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyCSS: true
        }
      : false
  }),
  new HtmlExcludeAssetsPlugin(),
  new CspHtmlPlugin(),
  new ImageminPlugin({
    disable: true,
    externalImages: {
      context: path.resolve(__dirname, "src/webviews/apps/images"),
      sources: glob.sync("src/webviews/apps/images/*.png"),
      destination: path.resolve(__dirname, "resources")
    },
    cacheFolder: path.resolve(__dirname, "node_modules", ".cache", "imagemin-webpack-plugin"),
    gifsicle: null,
    jpegtran: null,
    optipng: null,
    pngquant: {
      quality: "85-100",
      speed: true ? 1 : 10 // 1 is prod
    },
    svgo: null
  })
];

/**@type {import('webpack').Configuration}*/
const configExtension = {
  target: "node", // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

  entry: "./src/extension.ts", // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]"
  },
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode" // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              compilerOptions: {
                module: "es6" // override `tsconfig.json` so that TypeScript emits native JavaScript modules.
              }
            }
          }
        ]
      }
    ]
  }
};

/**@type {import('webpack').Configuration}*/
const configWebview = {
  context: path.resolve(__dirname, "src/webviews/apps"),
  entry: {
    "main-styles": ["./scss/main.scss"],
    settings: ["./index.ts"]
  },

  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist/webviews"),
    publicPath: "#{root}/dist/webviews/"
  },
  module: {
    rules: [
      {
        exclude: /node_modules|\.d\.ts$/,
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: "tsconfig.webviews.json",
            transpileOnly: true
          }
        }
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
              url: false
            }
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true
            }
          }
        ],
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    modules: [path.resolve(__dirname, "src/webviews/apps"), "node_modules"]
  },
  plugins: plugins,
  stats: {
    all: false,
    assets: true,
    builtAt: true,
    env: true,
    errors: true,
    timings: true,
    warnings: true
  }
};

// module.exports = [configExtension, configWebview];
module.exports = configExtension;
