'use strict';

module.exports = function(config) {
    config.set({
        basePath: '',
        frameworks: ['mocha', 'sinon-expect'],
        files: [
            'node_modules/jquery/dist/jquery.js',
            'dist/jolokia.js',
            'test/browser/*_test.js'
        ],
        port: 8080,
        logLevel: config.LOG_INFO,
        autoWatch: false,
        singleRun: true,
        browsers: ['Firefox', 'PhantomJS'],
        reporters: ['spec']
    });
};
