'use strict';

module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);
    require('time-grunt')(grunt);

    grunt.initConfig({
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
        uglify: {
            dist: {
                files: {
                    './dist/jolokia.min.js': ['src/jolokia.js'],
                    './dist/drivers/jolokia.cubism.min.js': ['src/drivers/jolokia.cubism.js']
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
        'jshint:dist',
        'karma',
        'uglify'
    ]);

    grunt.registerTask('default', [
        'jshint:all',
        'test',
        'build'
    ]);
};
