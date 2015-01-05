'use strict';

/**
* Mix multiple objects into target object.
*
* @param  {Object}     target Target object
* @param  {...Object}  mixins Mixins to enhance target object with
* @return {Object}            Target object
*/
exports.extend = function(target) {
	var mixins = Array.prototype.slice.call(arguments, 1);
	var getter, setter;

	return mixins.reduce(function(target, mixin) {
		if (mixin === null || typeof(mixin) !== 'object') return target;

		return Object.keys(mixin).reduce(function(target, key) {
			getter = mixin.__lookupGetter__(key);
			setter = mixin.__lookupSetter__(key);

			if (getter || setter) {
				if (getter) target.__defineGetter__(key, getter);
				if (setter) target.__defineSetter__(key, setter);
			} else {
				target[key] = mixin[key];
			}

			return target;
		}, target);
	}, target);
};

exports.isArray = function(object) {
	return Object.prototype.toString.call(object) === '[object Array]';
};

exports.isObject = function(object) {
	return object !== null && typeof(object) === 'object';
};

exports.base64encode = function(string) {
	if (typeof(window) !== 'undefined') {
		return window.btoa(string);
	}

	if (typeof('Buffer') !== undefined) {
		return new Buffer(string, 'utf8').toString('base64');
	}

	throw new Error('Unable to find window.btoa() or Buffer to convert to Base64');
};
