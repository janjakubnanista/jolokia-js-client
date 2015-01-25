'use strict';

var fs = require('fs');
var sys = require('sys');
var exec = require('child_process').exec;
var gulp = require('gulp');
var webpack = require('gulp-webpack');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var header = require('gulp-header');
var argv = require('yargs').argv;

var distDir = 'dist';
var banner = fs.readFileSync('header.txt');
var pkg = JSON.parse(fs.readFileSync('package.json'));
var bwr = JSON.parse(fs.readFileSync('bower.json'));

function puts(stdout, stderr) {
	if (stdout) {
		sys.puts(stdout);
	}

	if (stderr) {
		sys.puts(stdout);
	}
}

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

gulp.task('release', function(done) {
	var version = argv.v || argv.version;
	if (!version || !version.match(/\d+\.\d+\.\d+/)) {
		throw new Error('Invalid version number: ' + version);
	}

	bwr.version = pkg.version = version;

	fs.writeFileSync('package.json', JSON.stringify(pkg, null, '  '));
	fs.writeFileSync('bower.json', JSON.stringify(bwr, null, '  '));

	var semver = 'v' + version,
		message = '"Release ' + version + '"',
		commitAndTag = 'git add . && git commit -m ' + message + ' && git tag -a ' + semver + ' -m ' + message,
		publishAndPush = 'npm publish && git push origin head --tags';

	exec(commitAndTag, function(error, stdout, stderr) {
		puts(stdout, stderr);

		if (error) {
			throw new Error('Could not add git semver tag');
		}

		exec(publishAndPush, function(error, stdout, stderr) {
			puts(stdout, stderr);

			if (error) {
				throw new Error('Could not publish to NPM and/or push to repo');
			}

			done();
		});
	});
});
