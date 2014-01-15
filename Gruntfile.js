'use strict';

var fs = require('fs');

module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);
    require('time-grunt')(grunt);

    grunt.initConfig({
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
        uglify: {
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
        var options = this.options({
            driver: grunt.option('driver')
        });

        if (options.driver) {
            var source = 'src/drivers/jolokia.' + options.driver + '.js';

            if (!fs.existsSync(source)) {
                throw 'Invalid driver: ' + options.driver;
            }

            var target = 'dist/jolokia.enhanced.' + options.driver + '.min.js';
            var files = {};
            files[target] = [
                'src/jolokia.js',
                source
            ];

            grunt.config('uglify.enhanced', {
                files: files
            });

            grunt.config('concat.dist', {
                src: ['src/jolokia.js', source],
                dest: 'dist/jolokia.enhanced.' + options.driver + '.js'
            });
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
