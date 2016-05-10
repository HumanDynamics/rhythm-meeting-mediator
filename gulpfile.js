const gulp = require('gulp');
const template = require('gulp-template');
const concat = require('gulp-concat');
const clean = require('gulp-clean');
const gutil = require('gulp-util');
const imagemin = require('gulp-imagemin');
const uglify = require('gulp-uglify');
const dotenv = require('dotenv').config();

var bases = {
 src: 'src/',
 dist: 'dist/',
};

var paths = {
 templates: ['plugin/header.xml', 'plugin/index.template', 'plugin/footer.xml'],
 js: ['js/**/*.js'],
 css: ['css/**/*.css'],
 images: ['images/**/*.png']
};

gulp.task('clean', function() {
 return gulp.src(bases.dist)
 .pipe(clean());
});

gulp.task('templates', ['clean'], function() {
  return gulp.src(paths.templates, {cwd: bases.src})
    .pipe(concat('plugin.xml'))
    .pipe(template({serverUrl: process.env.RHYTHM_SERVER_URL}))
    .pipe(gulp.dest(bases.dist))
});

gulp.task('js', ['clean'], function() {
  gulp.src(bases.src + paths.js)
  .pipe(template({serverUrl: process.env.RHYTHM_SERVER_URL}))
  .pipe(gulp.dest(bases.dist + 'js'))

  gulp.src(bases.src + 'js/**/*.coffee')
  .pipe(template({serverUrl: process.env.RHYTHM_SERVER_URL}))
  .pipe(gulp.dest(bases.dist + 'js'))
})

gulp.task('css', ['clean'], function() {
  return gulp.src(bases.src + paths.css)
  .pipe(gulp.dest(bases.dist + 'css'))
})

gulp.task('images', ['clean'], function() {
 return gulp.src(paths.images, {cwd: bases.src})
 .pipe(imagemin())
 .pipe(gulp.dest(bases.dist + 'images/'));
});

gulp.task('default', ['clean', 'templates', 'js', 'css', 'images']);
