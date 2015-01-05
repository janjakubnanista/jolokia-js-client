'use strict';

var BaseJolokia = require('../common/jolokia');
var $ = require('jquery');
var q = require('q');
var utils = require('../common/utils');

var Jolokia = module.exports = function() {
	BaseJolokia.apply(this, arguments);
};

// Inherit from BaseJolokia
Jolokia.prototype = Object.create(BaseJolokia.prototype);
Jolokia.prototype.constructor = Jolokia;

Jolokia.prototype.httpRequest = function(options) {
	options.processData = false;

	if (options.auth) {
		var username = options.auth.username,
			password = options.auth.password;

		// Create base64 encoded authorization token
		options.headers = {
			Authorization: 'Basic ' + utils.base64encode(username + ':' + password)
		};

		// Add appropriate field for CORS access
		options.xhrFields = {
			// Please note that for CORS access with credentials, the request
			// must be asynchronous (see https://dvcs.w3.org/hg/xhr/raw-file/tip/Overview.html#the-withcredentials-attribute)
			// It works synchronously in Chrome nevertheless, but fails in Firefox.
			withCredentials: true
		};

		delete options.auth;
	}

	return q($.ajax(options));
};
