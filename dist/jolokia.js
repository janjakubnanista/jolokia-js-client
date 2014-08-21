/**
 * Jolokia JavaScript client library
 *
 * Version 0.1.8
 *
 * GitHub repository can be found at https://github.com/janjakubnanista/jolokia-js-client
 *
 * Released under MIT license
 *
 * Created by Ján Jakub Naništa <jan.jakub.nanista@gmail.com>
 */
var Poller = (function() {
    'use strict';

    function jobId(index) {
        return 'jolokia-job-' + index;
    }

    /**
     * Simple poller that allows for registration
     * of Jolokia requests that are to be peridically executed.
     *
     * @param {Jolokia} jolokia Instance of Jolokia
     */
    var Poller = function(jolokia) {
        var isRunning = false;
        var interval = -1;
        var timer = null;
        var jobCount = 0;
        var jobs = {};

        this._register = function(job) {
            var id = jobId(++jobCount);

            jobs[id] = job;

            return id;
        };

        this._unregister = function(id) {
            if (!jobs[id]) {
                throw 'Invalid job ID: ' + id;
            }

            delete jobs[id];
        };

        this._clear = function() {
            jobs = {};
        };

        this._execute = function() {
            for (var id in jobs) {
                jolokia.request(jobs[id].request, jobs[id].options);
            }
        };

        this._start = function(intervalValue) {
            if (isRunning) {
                if (interval === intervalValue) {
                    return;
                }

                this._stop();
            }

            interval = intervalValue;
            isRunning = true;
            timer = setInterval(function() {
                this._execute();
            }.bind(this), interval);

            this._execute();
        };

        this._stop = function() {
            if (!isRunning) return;

            clearInterval(timer);
        };

        this.interval = function() {
            return interval;
        };

        this.isRunning = function() {
            return isRunning;
        };
    };

    /**
     * Registers a job on the poller.
     *
     * @param  {Object|Array}   request A request or an array of request that will be periodically executed by jolokia
     * @param  {Object}         options [optional] Options that will be passed along with requests
     * @return {String}         ID of registered job
     */
    Poller.prototype.register = function(request, options) {
        if (typeof(options) === 'function') {
            options = {
                success: options
            };
        }

        var job = {
            options: options,
            request: request
        };

        var id = this._register(job);

        return id;
    };

    /**
     * Unregisters a job from the poller
     *
     * @param  {String} id      ID of previously registered job
     * @return {Poller}         this object
     */
    Poller.prototype.unregister = function(id) {
        this._unregister(id);

        return this;
    };

    /**
     * Clears all previously registered jobs
     *
     * @return {Poller}         this object
     */
    Poller.prototype.clear = function() {
        this._clear();

        return this;
    };

    /**
     * Starts the poller.
     *
     * If the poller is already running (i.e. {@link #isRunning()} is <code>true</code> then the scheduler
     * is restarted, but only if the new interval differs from the currently active one.
     *
     * @param {Number}  interval interval in milliseconds between two polling attempts
     *
     * @return {Poller} This instance
     */
    Poller.prototype.start = function(interval) {
        this._start(interval);

        return this;
    };

    /**
     * Stops the poller
     *
     * @return {Poller} This instance
     */
    Poller.prototype.stop = function() {
        this._stop();

        return this;
    };

    return Poller;
})();

var Jolokia = (function($) {
    'use strict';

    var PROCESSING_PARAMS = [
        'maxDepth',
        'maxCollectionSize',
        'maxObjects',
        'ignoreErrors',
        'canonicalNaming',
        'serializeException',
        'includeStackTrace',
        'ifModifiedSince'
    ];

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
            return $.Deferred().reject(responses[0]);
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
     * Creates an object containing subset of properties
     * of orginal object. Only a shallow copy is performed as nothing more is required.
     *
     * @param  {Object}         object  Source object
     * @param  {Array<String>}  keys    Array of property names to copy from source object
     * @return {Object}                 New object containing only properties specified by keys argument
     */
    function extractKeys(object, keys) {
        var extracted = {};

        keys.forEach(function(key) {
            if (object[key]) extracted[key] = object[key];
        });

        return extracted;
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

    /**
     * Constructor method.
     *
     * Accepts oe argument, either an URL of backend
     * to use with requests or hash of options (refer to documentation of Jolokia.request
     * for available options).
     *
     * @param {String|Object} options Hash of options or String URL to use with requests
     */
    var Jolokia = function(options) {
        if (typeof(options) === 'string') {
            options = { url: options };
        }

        options = $.extend({}, options);

        this.options = function() {
            if (arguments.length === 0) {
                return $.extend({}, options);
            } else {
                options = $.extend(options, arguments[0]);
            }
        };

        var poller = new Poller(this);
        this.poller = function() {
            return poller;
        };
    };

    /**
     * Escape s! and /, then URI encodes string
     *
     * @param  {String} string      String to be escaped
     * @return {String}             Escaped string
     */
    Jolokia.escape = function(string) {
        return encodeURIComponent(string.replace(/[!\/]/, '!$1'));
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
        if ($.isArray(value)) {
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
            $.isArray(request) ||
            request.config ||
            (request.type.match(/read/i) && $.isArray(request.attribute)) ||
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

        if ($.isArray(urlSuffix)) {
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
        options = $.extend({}, this.options(), options);

        if (!options.url || typeof(options.url) !== 'string') {
            throw 'Invalid URL : ' + options.url;
        }

        var method = (!options.method || options.method === 'auto' ? this.determineRequestMethod(request) : options.method).toLowerCase();

        if (method !== 'get' && method !== 'post') {
            throw new Error('Unsupported request method: ' + method);
        }

        if (method === 'post') {
            if (options.jsonp) {
                throw new Error('Can not use JSONP with POST requests');
            }
        } else {
            if ($.isArray(request)) {
                throw new Error('Cannot use GET with bulk requests');
            }

            if (request.type.match(/read/i) && $.isArray(request.attribute)) {
                throw new Error('Cannot use GET for read with multiple attributes');
            }

            if (request.target) {
                throw new Error('Cannot use GET request with proxy mode');
            }

            if (request.config) {
                throw new Error('Cannot use GET with request specific config');
            }
        }

        var ajaxParams = {};

        if (options.username && options.password) {
            // Create base64 encoded authorization token
            if (typeof(window.btoa) === 'function') {
                var token = options.username + ':' + options.password;

                ajaxParams.headers = {
                    Authorization: 'Basic ' + window.btoa(token)
                };
            }

            // Add appropriate field for CORS access
            ajaxParams.xhrFields = {
                // Please note that for CORS access with credentials, the request
                // must be asynchronous (see https://dvcs.w3.org/hg/xhr/raw-file/tip/Overview.html#the-withcredentials-attribute)
                // It works synchronously in Chrome nevertheless, but fails in Firefox.
                withCredentials: true
            };
        }

        if (options.timeout) {
            ajaxParams.timeout = options.timeout;
        }

        // Add trailing slash to URL
        options.url = options.url.replace(/\/*$/, '/');

        var queryParams = extractKeys(options, PROCESSING_PARAMS);
        options.url = addQueryParamsToUrl(options.url, queryParams);

        if (method === 'get') {
            options.url += this.constructUrl(request, options);
        } else {
            ajaxParams.data = JSON.stringify(request);
        }

        // Add request method and URL
        ajaxParams.type = method;
        ajaxParams.url = options.url;
        ajaxParams.processData = false;
        ajaxParams.dataType = options.jsonp ? 'jsonp' : 'json';
        ajaxParams.headers = $.extend({}, ajaxParams.headers, options.headers);

        return this.ajax(ajaxParams).then(function(response) {
            var responses = $.isArray(response) ? response: [response];

            if (typeof(options.success) === 'function') {
                options.success.call(this, responses);
            }

            return responses;
        }.bind(this), options.error);
    };

    Jolokia.prototype.ajax = function(options) {
        return $.ajax(options);
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
        if (arguments.length === 3 && $.isPlainObject(path)) {
            options = path;
            path = null;
        } else if (arguments.length === 2 && $.isPlainObject(attribute)) {
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
        if (arguments.length === 4 && $.isPlainObject(path)) {
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

        if (args.length > 2 && $.isPlainObject(args[args.length - 1])) {
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
        if (arguments.length === 1 && !$.isArray(path) && $.isPlainObject(path)) {
            options = path;
            path = null;
        }

        var request = { type: 'list' };

        if (path) {
            request.path = path;
        }

        return this.request(request, options).then(returnValueOrThrow);
    };

    Jolokia.prototype.register = function(request, options) {
        return this.poller().register(request, options);
    };

    Jolokia.prototype.unregister = function(id) {
        return this.poller().unregister(id);
    };

    Jolokia.prototype.start = function(interval) {
        return this.poller().start(interval || this.options().interval);
    };

    Jolokia.prototype.stop = function() {
        return this.poller().stop();
    };

    return Jolokia;
})(jQuery);

window.Jolokia = Jolokia;
