/*
 * @Author: wangguixing
 * @Date: 2023-06-02 11:37:01
 * @LastEditors: wangguixing
 * @LastEditTime: 2023-06-02 15:03:55
 * @FilePath: \gulpfile.js
 */
const pinyin = require("word-pinyin").default;
const gulp = require("gulp");
const del = require("del");
const iconfont = require("gulp-iconfont");
const rename = require("gulp-rename");
const fs = require("fs");
const template = require("gulp-template");
const svgstore = require("gulp-svgstore");
const through2 = require("through2");
const htmlmin = require("gulp-htmlmin");
const path = require("path");

const outputPath = "./iconfont"; // 输出路径
const iconfontConf = {
  svgPath: "./svg",
  fontName: "zc-lowcode-font", // font-family
  prefix: "zc", // class 前缀 和 symbol id 前缀
  templateCSSPath: path.resolve(__dirname, "./templates/iconfont.css"), // css 模板的路径
  templateHTMLPath: path.resolve(
    __dirname,
    "./templates/iconfont-example.html"
  ), // iconfont example html path
  outputCSSPath: outputPath, // css 输出路径,这个路径是相对 outputPath的路径（我也不知道为什么）
  fontsPathInCSS: "./fonts/", // iconfont.css 中引入font文件时用到的相对路径
  outputFontsPath: `${outputPath}/fonts`, // 字体文件输出路径
  outputHTML: `${outputPath}`, // 输出html demo的路径
  startUnicode: 0xea01, // 编码开始点
  prependUnicode: true, // recommended option
};

const symbolConf = Object.assign({}, iconfontConf, {
  templateJSPath: path.resolve(__dirname, "./templates/iconfont.js"), // js 模板的路径
  outputJS: outputPath, // 输出js文件的路径
  templateHTMLPath: path.resolve(__dirname, "./templates/symbol-example.html"), // symbol example html path
});

function fixIconName(oriName) {
  const pinyinName = pinyin
    .getPinyin(oriName)
    .toString()
    .replace(/,/g, "")
    .replace(/ /g, "")
    .replace(".svg", "");
  return `${iconfontConf.prefix}-${pinyinName}`;
}

// 返回所有svg文件的文件名
function getIcons() {
  let icons = fs.readdirSync("./svg");
  icons = icons.filter((name) => name.endsWith(".svg")).map(fixIconName);
  return icons;
}

gulp.config = (options) => {
  Object.assign(iconfontConf, options);
  Object.assign(symbolConf, options);
};

// 清空文件
gulp.task("del", function () {
  return del(["./iconfont/*"]);
});

gulp.task("iconfont", function () {
  function genCSS(glyphs, options) {
    gulp
      .src(iconfontConf.templateCSSPath)
      .pipe(
        template({
          fontPath: iconfontConf.fontsPathInCSS,
          fontName: iconfontConf.fontName,
          prefix: iconfontConf.prefix,
          glyphs,
          className: "icon",
        })
      )
      .pipe(gulp.dest(iconfontConf.outputCSSPath));
  }

  return gulp
    .src(`${iconfontConf.svgPath}/**/*.svg`)
    .pipe(
      rename(function (path) {
        path.basename = fixIconName(path.basename);
      })
    )
    .pipe(
      iconfont({
        fontName: iconfontConf.fontName,
        formats: ["svg", "ttf", "eot", "woff", "woff2"],
        normalize: true,
        options: {
          fixedWidth: false,
          normalize: false,
          fontHeight: 512,
          descent: -32,
          normalize: true,
          startUnicode: iconfontConf.startUnicode,
          prependUnicode: iconfontConf.prependUnicode,
        },
      })
    )
    .on("glyphs", genCSS)
    .pipe(gulp.dest(iconfontConf.outputFontsPath));
});

// 生成示例代码
gulp.task("iconfont-example", function () {
  return gulp
    .src(iconfontConf.templateHTMLPath)
    .pipe(
      template({
        icons: getIcons(),
        fontName: iconfontConf.fontName,
      })
    )
    .pipe(gulp.dest(iconfontConf.outputHTML));
});

// 生成 iconfont.js 文件
gulp.task("symbol", function () {
  return new Promise((resolve) => {
    gulp
      .src(`${symbolConf.svgPath}/**/*.svg`)
      .pipe(
        rename(function (path) {
          path.basename = fixIconName(path.basename);
        })
      )
      .pipe(svgstore({ inlineSvg: true }))
      .pipe(htmlmin({ collapseWhitespace: true }))
      .pipe(
        through2.obj(function (file) {
          resolve(file.contents.toString());
        })
      );
  }).then((spriteSvg) => {
    gulp
      .src(symbolConf.templateJSPath)
      .pipe(
        template({
          svgContent: spriteSvg,
        })
      )
      .pipe(gulp.dest(symbolConf.outputJS));
  });
});

gulp.task("symbol-example", function () {
  return gulp
    .src(symbolConf.templateHTMLPath)
    .pipe(
      template({
        icons: getIcons(),
      })
    )
    .pipe(gulp.dest(symbolConf.outputHTML));
});

// 运行这个task，生成 iconfont
gulp.task("gen-iconfont", gulp.parallel("iconfont", "iconfont-example"));

// 运行这个task，生成 smybol
gulp.task("gen-symbol", gulp.parallel("symbol", "symbol-example"));

module.exports = gulp;
