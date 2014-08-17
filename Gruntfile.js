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

    grunt.registerTask('build', [
        'clean:dist',
        'jshint:dist',
        'karma',
        'concat',
        'uglify'
    ]);

    grunt.registerTask('default', [
        'jshint:all',
        'test',
        'build'
    ]);
};
