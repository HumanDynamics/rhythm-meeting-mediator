const gulp = require('gulp')
const template = require('gulp-template')
const concat = require('gulp-concat')
const clean = require('gulp-clean')
const imagemin = require('gulp-imagemin')
const uglify = require('gulp-uglify')
const gutil = require('gulp-util')
const coffee = require('gulp-coffee')
const s3 = require('gulp-s3-upload')({useIAM: true})
require('dotenv').config()

var bases = {
  src: 'src/',
  dist: 'dist/'
}

var paths = {
  templates: ['plugin/header.xml', 'plugin/index.template', 'plugin/footer.xml'],
  js: ['js/**/*.js'],
  coffee: ['js/**/*.coffee'],
  css: ['css/**/*.css'],
  images: ['images/**/*.png'],
  deps: ['bower_components/**']
}

gulp.task('clean', function () {
  return gulp.src(bases.dist)
             .pipe(clean())
})

gulp.task('templates', ['clean'], function () {
  if (process.env.RHYTHM_SERVER_URL === false || process.env.RHYTHM_MM_HOSTING_URL === false) {
    throw new gutil.PluginError({
      plugin: 'templates',
      message: 'Please include a RHYTHM_SERVER_URL environment variable'
    })
  }
  return gulp.src(paths.templates, {cwd: bases.src})
             .pipe(concat('plugin.xml'))
             .pipe(template({serverUrl: process.env.RHYTHM_SERVER_URL,
                             hostingUrl: process.env.RHYTHM_MM_HOSTING_URL}))
             .pipe(gulp.dest(bases.dist))
})

gulp.task('js', ['clean'], function () {
  gulp.src(bases.src + paths.js)
      .pipe(template({serverUrl: process.env.RHYTHM_SERVER_URL,
                      hostingUrl: process.env.RHYTHM_MM_HOSTING_URL}))
      .pipe(uglify())
      .pipe(gulp.dest(bases.dist + 'js'))

  gulp.src(bases.src + paths.coffee)
          .pipe(template({serverUrl: process.env.RHYTHM_SERVER_URL,
                          hostingUrl: process.env.RHYTHM_MM_HOSTING_URL}))
          .pipe(coffee({bare: true}).on('error', gutil.log))
          .pipe(gulp.dest(bases.dist + 'js'));
})

gulp.task('deps', ['clean'], function () {
  gulp.src(paths.deps)
      .pipe(gulp.dest(bases.dist + 'bower_components'))
})

gulp.task('css', ['clean'], function () {
  return gulp.src(bases.src + paths.css)
             .pipe(gulp.dest(bases.dist + 'css'))
})

gulp.task('images', ['clean'], function () {
  return gulp.src(paths.images, {cwd: bases.src})
             .pipe(imagemin())
             .pipe(gulp.dest(bases.dist + 'images/'))
})

gulp.task('s3', function () {
  gulp.src('./dist/**')
      .pipe(s3({
        Bucket: process.env.RHYTHM_MM_S3_BUCKET,
        ACL: 'public-read'
      }, {
        maxRetries: 5
      }))
})

gulp.task('build', ['clean', 'templates', 'deps', 'js', 'css', 'images'])
gulp.task('deploy', ['s3'])
