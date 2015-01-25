'use strict';

var fs = require('fs');
var gulp = require('gulp');
var webpack = require('gulp-webpack');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var header = require('gulp-header');

var distDir = 'dist';
var banner = fs.readFileSync('header.txt');
var pkg = JSON.parse(fs.readFileSync('package.json'));

gulp.task('build', function() {
	return gulp.src('src/browser/jolokia.js')
		.pipe(webpack({
			target: 'web',
			externals: {
				jquery: 'var $'
			},
			node: {
				process: false,
				buffer: false
			},
			output: {
				library: 'Jolokia',
				libraryTarget: 'umd'
			},
			resolve: {
				alias: {
					'request': './browser/http.js'
				}
			}
		}))
		.pipe(concat('jolokia.js'))
		.pipe(header(banner, { version: pkg.version }))
		.pipe(gulp.dest(distDir))
		.pipe(uglify())
		.pipe(concat('jolokia.min.js'))
		.pipe(header(banner, { version: pkg.version }))
		.pipe(gulp.dest(distDir));
});
