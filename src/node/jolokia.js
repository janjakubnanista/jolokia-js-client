'use strict';

var BaseJolokia = require('../common/jolokia');
var request = require('request');
var q = require('q');

var Jolokia = module.exports = function() {
	BaseJolokia.apply(this, arguments);
};

// Inherit from BaseJolokia
Jolokia.prototype = Object.create(BaseJolokia.prototype);
Jolokia.prototype.constructor = Jolokia;

Jolokia.prototype.httpRequest = function(options) {
	var method = options.method,
		deferred = new q.defer();

	options.body = options.data;
	delete options.data;

	request[method](options, function(error, response, body) {
		if (error) {
			return deferred.reject(error);
		}

		if (response.statusCode !== 200) {
			return deferred.reject(new Error('HTTP Error ' + response.statusCode));
		}

		var data = JSON.parse(body);

		deferred.resolve(data);
	});

	return deferred.promise;
};
