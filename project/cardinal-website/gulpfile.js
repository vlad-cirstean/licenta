const gulp = require('gulp');
const run = require("gulp-run-command").default;
const include = require('gulp-include');
const {series} = require('gulp');
const CardinalDepPath = "node_modules/cardinal/";

function buildCardinal(cb) {
    let currentDir = process.cwd();
    process.chdir('../cardinal');
    run('npm run build')().then(function () {
        process.chdir(currentDir);
        cb();
    });
};

function buildSitemap(cb) {
    run('npm run generate-sitemap')().then(cb);
};


function copyJsFile(cb) {

    gulp.src(`${CardinalDepPath}dist/cardinal.js`)
        .pipe(include({
            separateInputs: true,
        }))
        .pipe(gulp.dest('./release'));
    cb();
};

function copyJsFolderBuild(cb) {

    gulp.src(`${CardinalDepPath}dist/cardinal/**/*`)
        .pipe(include({
            separateInputs: true,
        }))
        .pipe(gulp.dest('./release/cardinal'));
    cb();
}

function copyThemes(cb) {
    gulp.src(`${CardinalDepPath}themes/**/*`)
        .pipe(include({
            separateInputs: true,
        }))
        .pipe(gulp.dest('./release/themes'));
    cb();
}

function copySourceFiles(cb) {
    gulp.src('src/**/*')
        .pipe(gulp.dest('./release/'));
    cb();
}


exports.build = series(buildCardinal, copyJsFile, copyJsFolderBuild, buildSitemap, copyThemes, copySourceFiles);



