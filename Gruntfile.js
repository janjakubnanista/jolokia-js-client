'use strict';

var fs = require('fs');
var banner = fs.readFileSync(__dirname + '/header.txt').toString('utf8');
var version = JSON.parse(fs.readFileSync(__dirname + '/package.json').toString('utf8')).version;

module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);
    require('time-grunt')(grunt);

    grunt.initConfig({
        yeoman: {
            version: version,
            banner: banner
        },
        clean: {
            dist: ['dist']
        },
        watch: {
            test: {
                files: ['src/**/*.js', 'test/spec/**/*.js'],
                tasks: ['karma']
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: [
                'Gruntfile.js',
                'src/**/*.js'
            ],
            dist: [
                'src/**/*.js'
            ],
            test: {
                options: {
                    jshintrc: 'test/.jshintrc'
                },
                src: ['test/spec/{,*/}*.js']
            }
        },
        concat: {
            options: {
                banner: '<%= yeoman.banner %>'
            },
            dist: {
                files: {
                    'dist/jolokia.js': ['src/jolokia.js']
                }
            }
        },
        uglify: {
            options: {
                banner: '<%= yeoman.banner %>'
            },
            dist: {
                files: {
                    'dist/jolokia.min.js': ['src/jolokia.js']
                }
            }
        },
        karma: {
            unit: {
                configFile: 'karma.conf.js',
                singleRun: true
            }
        }
    });

    grunt.registerTask('test', function(target) {
        var tasks = [
            'karma'
        ];

        if (target === 'live') {
            tasks.push('watch');
        }

        grunt.task.run(tasks);
    });

    grunt.registerTask('enhance', function() {
        var driversDir = __dirname + '/src/drivers/';
        var drivers = fs.readdirSync(driversDir);
        var minBuilds = {};
        var concatBuilds = {};

        if (drivers) {
            drivers.forEach(function(driver) {
                driver = driver.replace(/\.js$/, '');

                var source = driversDir + driver + '.js';
                var minTarget = 'dist/jolokia.enhanced.' + driver + '.min.js';
                var concatTarget = 'dist/jolokia.enhanced.' + driver + '.js';

                minBuilds[minTarget] = [ 'src/jolokia.js', source ];
                concatBuilds[concatTarget] = [ 'src/jolokia.js', source ];
            });

            var minFiles = grunt.config.get('uglify.dist.files');
            for (var target in minBuilds) {
                minFiles[target] = minBuilds[target];
            }

            var concatFiles = grunt.config.get('concat.dist.files');
            for (target in concatBuilds) {
                concatFiles[target] = concatBuilds[target];
            }

            grunt.config.set('uglify.dist.files', minFiles);
            grunt.config.set('concat.dist.files', concatFiles);
        }
    });

    grunt.registerTask('build', [
        'clean:dist',
        'jshint:dist',
        'karma',
        'enhance',
        'concat',
        'uglify'
    ]);

    grunt.registerTask('default', [
        'jshint:all',
        'test',
        'build'
    ]);
};
