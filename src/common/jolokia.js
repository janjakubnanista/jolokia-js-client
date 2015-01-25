'use strict';

var utils = require('./utils');
var q = require('q');

/**
 * Constructor method.
 *
 * Accepts one argument, either an URL of backend
 * to use with requests or hash of options (refer to documentation of Jolokia.request
 * for available options).
 *
 * @param {String|Object} options Hash of options or String URL to use with requests
 */
var Jolokia = module.exports = function(options) {
    if (typeof(options) === 'string') {
        options = { url: options };
    }

    options = utils.extend({}, options);
    this.options = function() {
        return utils.extend({}, options);
    };
};

/**
 * Escapes !, " and /, then URI encodes string
 *
 * @param  {String} string      String to be escaped
 * @return {String}             Escaped string
 */
Jolokia.escape = function(string) {
    return encodeURIComponent(string.replace(/(["!\/])/g, '!$1'));
};

/**
 * Returns true if passed response object represents an error state
 *
 * @param  {Object}  response   Jolokia server response
 * @return {Boolean}            True if response object represents an error
 */
Jolokia.isError = function(response) {
    return !response.status || response.status !== 200;
};

/**
 * Converts a value to string to be used to construct URL for GET requests.
 * Value is not escaped though, it must be done separately via Jolokia.escape method
 *
 * @param  {Any} value          Value to be converted
 * @return {String}             String representation of the value
 */
Jolokia.toString = function(value) {
    if (utils.isArray(value)) {
        return value.map(valueToString).join(',');
    } else {
        return valueToString(value);
    }
};

/**
 * Automatically determine HTTP request method to be used for particular request.
 * This follows the specification for jolokia requests that can be found at
 * http://www.jolokia.org/reference/html/clients.html#js-request-sync-async
 *
 * @param  {Object|Array} request   Jolokia request
 * @return {String}                 Lowercase HTTP method, either post or get
 */
Jolokia.prototype.determineRequestMethod = function(request) {
    var method =
    utils.isArray(request) ||
        request.config ||
        (request.type.match(/read/i) && utils.isArray(request.attribute)) ||
        request.target ?
        'post' : 'get';

    return method;
};

/**
 * Create an url to be used with GET requests
 *
 * @param  {Object} request Jolokia request
 * @return {String}         URL to be used with HTTP GET request
 */
Jolokia.prototype.constructUrl = function(request) {
    var type = request.type.toLowerCase();
    var urlParts = [];
    var urlSuffix = '';

    if (type === 'read') {
        if (request.attribute) {
            urlParts = [request.mbean, request.attribute];
            urlSuffix = request.path;
        } else {
            urlParts = [request.mbean];
        }
    } else if (type === 'write') {
        urlParts = [request.mbean, request.attribute, Jolokia.toString(request.value)];
        urlSuffix = request.path;
    } else if (type === 'exec') {
        urlParts = [request.mbean, request.operation];

        if (request.arguments) {
            urlParts = urlParts.concat(request.arguments.map(Jolokia.toString));
        }
    } else if (type === 'search') {
        urlParts = [request.mbean];
    } else if (type === 'list') {
        urlSuffix = request.path;
    }

    if (utils.isArray(urlSuffix)) {
        urlSuffix = urlSuffix.map(Jolokia.escape).join('/');
    }

    // Add request operation at the beginning of the URL
    urlParts.unshift(type);

    urlParts = urlParts.map(Jolokia.escape);
    urlSuffix = urlSuffix ? urlSuffix.replace(/^\//, '') : '';

    return urlParts.join('/') + '/' + urlSuffix;
};

/**
 * Central method used to create HTTP requests
 *
 * @param  {Object|Array}   request     Jolokia request object or an array of objects
 * @param  {Object}         options     [optional] Additional options for request
 * @return {jQuery.Promise} jQuery jXHR promise resolved with an array of jolokia server response objects
 */
Jolokia.prototype.request = function (request, options) {
    options = utils.extend({}, this.options(), options);

    if (!options.url || typeof(options.url) !== 'string') {
        throw 'Invalid URL : ' + options.url;
    }

    var method = (options.method || this.determineRequestMethod(request)).toLowerCase();

    if (method !== 'get' && method !== 'post') {
        throw new Error('Unsupported request method: ' + method);
    }

    if (method === 'get') {
        if (utils.isArray(request)) {
            throw new Error('Cannot use GET with bulk requests');
        }

        if (request.type.match(/read/i) && utils.isArray(request.attribute)) {
            throw new Error('Cannot use GET for read with multiple attributes');
        }

        if (request.target) {
            throw new Error('Cannot use GET request with proxy mode');
        }

        if (request.config) {
            throw new Error('Cannot use GET with request specific config');
        }
    }

    // Add trailing slash to URL
    options.url = options.url.replace(/\/*$/, '/');

    if (method === 'get') {
        options.url += this.constructUrl(request, options);
    } else {
        options.data = JSON.stringify(request);
    }

    // Add request method and URL
    options.method = method;

    options.url = addQueryParamsToUrl(options.url, options.query || {});

    return this.httpRequest(options).then(function(response) {
        var responses = utils.isArray(response) ? response: [response];

        if (typeof(options.success) === 'function') {
            options.success.call(this, responses);
        }

        return responses;
    }.bind(this), options.error);
};

/**
 * Get one or more attributes
 *
 * @param   {String} mbean name of MBean to query. Can be a pattern.
 * @param   {String} attribute      attribute name. If an array, multiple attributes are fetched.
 *                                  If <code>null</code>, all attributes are fetched.
 * @param   {String}    path        optional path within the return value.
 *                                  For multi-attribute fetch, the path is ignored.
 * @param   {Object}    options     options passed to Jolokia.request()
 *
 * @return  {jQuery.Promise}
 */
Jolokia.prototype.get =  function(mbean, attribute, path, options) {
    if (arguments.length === 3 && utils.isObject(path)) {
        options = path;
        path = null;
    } else if (arguments.length === 2 && utils.isObject(attribute)) {
        options = attribute;
        attribute = null;
        path = null;
    }

    var request = { type: 'read', mbean: mbean, attribute: attribute };

    if (path) {
        request.path = path;
    }

    return this.request(request, options).then(returnValueOrThrow);
};

/**
 * Set an attribute on a MBean.
 *
 * @param mbean objectname of MBean to set
 * @param attribute the attribute to set
 * @param value the value to set
 * @param path an optional <em>inner path</em> which, when given, is used to determine
 *        an inner object to set the value on
 * @param opts additional options passed to Jolokia.request()
 * @return the previous value
 */
Jolokia.prototype.set = function(mbean, attribute, value, path, options) {
    if (arguments.length === 4 && utils.isObject(path)) {
        options = path;
        path = null;
    }

    var request = { type: 'write', mbean: mbean, attribute: attribute, value: value };

    if (path) {
        request.path = path;
    }

    return this.request(request, options).then(returnValueOrThrow);
};

/**
 * Execute a JMX operation and return the result value
 *
 * @param mbean objectname of the MBean to operate on
 * @param operation name of operation to execute. Can contain a signature in case overloaded
 *                  operations are to be called (comma separated fully qualified argument types
 *                  append to the operation name within parentheses)
 * @param arg1, arg2, ..... one or more argument required for executing the operation.
 * @param opts optional options for Jolokia.request() (must be an object)
 * @return the return value of the JMX operation.
 */
Jolokia.prototype.execute = function(mbean, operation) {
    var request = { type: 'exec', mbean: mbean, operation: operation };

    var options,
        args = Array.prototype.slice.call(arguments, 0);

    if (args.length > 2 && utils.isObject(args[args.length - 1])) {
        options = args.pop();
    }

    if (args.length > 2) {
        request.arguments = args.slice(2);
    }

    return this.request(request, options).then(returnValueOrThrow);
};

/**
 * Search for MBean based on a pattern and return a reference to the list of found
 * MBeans names (as string). If no MBean can be found, <code>null</code> is returned. For
 * example,
 *
 * jolokia.search("*:j2eeType=J2EEServer,*")
 *
 * searches all MBeans whose name are matching this pattern, which are according
 * to JSR77 all application servers in all available domains.
 *
 * @param mbeanPattern pattern to search for
 * @param opts optional options for Jolokia.request()
 * @return an array with ObjectNames as string
 */
Jolokia.prototype.search = function(mbeanPattern, options) {
    var request = { type: 'search', mbean: mbeanPattern };

    return this.request(request, options).then(returnValueOrThrow);
};

/**
 * This method return the version of the agent and the Jolokia protocol
 * version as part of an object. If available, server specific information
 * like the application server's name are returned as wel.
 * A typical response looks like
 *
 * <pre>
 *  {
 *    protocol: "4.0",
 *    agent: "0.82",
 *    info: {
 *       product: "glassfish",
 *       vendor": "Sun",
 *       extraInfo: {
 *          amxBooted: false
 *       }
 *  }
 * </pre>
 *
 * @param opts optional options for Jolokia.request()
 * @param version and other meta information as object
 */
Jolokia.prototype.version = function(options) {
    return this.request({ type: 'version' }, options).then(returnValueOrThrow);
};


/**
 * Get all MBeans as registered at the specified server. A C<$path> can be
 * specified in order to fetchy only a subset of the information. When no path is
 * given, the returned value has the following format
 *
 * <pre>
 * {
 *     &lt;domain&gt; :
 *     {
 *       &lt;canonical property list&gt; :
 *       {
 *           "attr" :
 *           {
 *              &lt;atrribute name&gt; :
 *              {
 *                 desc : &lt;description of attribute&gt;
 *                 type : &lt;java type&gt;,
 *                 rw : true/false
 *              },
 *              ....
 *           },
 *           "op" :
 *           {
 *              &lt;operation name&gt; :
 *              {
 *                "desc" : &lt;description of operation&gt;
 *                "ret" : &lt;return java type&gt;
 *                "args" :
 *                [
 *                   {
 *                     "desc" : &lt;description&gt;,
 *                     "name" : &lt;name&gt;,
 *                     "type" : &lt;java type&gt;
 *                   },
 *                   ....
 *                ]
 *              },
 *              ....
 *       },
 *       ....
 *     }
 *     ....
 *  }
 * </pre>
 *
 * A complete path has the format &lt;domain&gt;/property
 * list&gt;/("attribute"|"operation")/&lt;index&gt;">
 * (e.g. <code>java.lang/name=Code Cache,type=MemoryPool/attribute/0</code>). A path can be
 * provided partially, in which case the remaining map/array is returned. The path given must
 * be already properly escaped (i.e. slashes must be escaped like <code>!/</code> and exlamation
 * marks like <code>!!</code>.
 * See also the Jolokia Reference Manual for a more detailed discussion of inner paths and escaping.
 *
 *
 * @param path optional path for diving into the list
 * @param opts optional opts passed to Jolokia.request()
 */
Jolokia.prototype.list = function(path, options) {
    if (arguments.length === 1 && !utils.isArray(path) && utils.isObject(path)) {
        options = path;
        path = null;
    }

    var request = { type: 'list' };

    if (path) {
        request.path = path;
    }

    return this.request(request, options).then(returnValueOrThrow);
};

/**
* Private helper function.
* Returns the value attribute from server response or throws an exception
* in case of error.
*
* @param  {Array} responses    Jolokia server responses
* @return {Mixed}              Response value
*/
function returnValueOrThrow(responses) {
    if (responses[0].status !== 200) {
        return q.reject(responses[0]);
    }

    return responses[0].value;
}

/**
* Private helper function.
* Serializes value to be passed over to Jolokia backend
* following Jolokia protocol.
*
* @param  {Object} value Value to serialize
* @return {String}       Serialized value
*/
function valueToString(value) {
    if (value === null || value === undefined) return '[null]';

    if (value === '') return '""';

    return value.toString();
}

/**
* Private helper function.
* Adds URL query parameters to URL.
*
* @param {String} url    URL
* @param {Object} params Hash containing query parameters
*/
function addQueryParamsToUrl(url, params) {
    var query = [];

    for (var key in params) {
        query.push(key + '=' + params[key]);
    }

    query = query.join('&');

    if (query) {
        if (url.indexOf('?') === -1) {
            url = url + '?' + query;
        } else {
            url = url.replace('?', '?' + query + '&');
        }
    }

    return url;
}
