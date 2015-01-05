Jolokia JavaScript client
=========================

JavaScript client for Jolokia server for both Node.js and browser.

[![Build Status](https://travis-ci.org/janjakubnanista/jolokia-js-client.svg?branch=master)](https://travis-ci.org/janjakubnanista/jolokia-js-client)

To install via npm, please run

    npm install jolokia

Or via bower

    bower install jolokia

**Important** If you use this library in browser without using browserify or equivalent tool,
please use `dist/jolokia.js` (or `dist/jolokia.min.js`) instead of `main`
file declared in `package.json`.

**Important** If you use this library in browser, you need to include your own jQuery.

## Usage

*For jolokia documentation please check their [offical website](http://www.jolokia.org/reference/html/).*

    // In Node.js or using Browserify
    var Jolokia = require('jolokia');
    
    // In browser
    var Jolokia = window.Jolokia;
    
    // Or using RequireJs
    require(['./path/to/jolokia'], function(Jolokia) {
       // code below
    });
    
    var jolokia = new Jolokia({
        url: '/jmx', // use full url when in Node.js environment
        method: 'post', // force specific HTTP method
    });
    
    jolokia.list().then(function(value) {
       // do something with list of JMX domains
    }, function(error) {
       // handle error
    });

## API

`new Jolokia(options)`

Constructor.

`options` *`String|Object`* *[optional]* Instance configuration. If String, it will be used as endpoint URL. You can rewrite these default options when calling individual methods.

`options.url` *`String`* *[optional]* Endpoint URL. You have to provide an URL either to constructor or when calling any method.

`options.method` *`String`* *[optional]* Force HTTP method to use. Must be one of `GET`, `POST` (case-insensitive). If not specified, HTTP method will be guessed base on JMX request:

- `GET` for single requests
- `POST` for multiple requests or requests for multiple attributes

`options.query` *`Object`* *[optional]* URL query parameters to add to query. Especially useful to pass jolokia configuration options such as `maxCollectionSize`. Please see official documentation for list of supported values.

`options.auth` *`Object`* *[optional]* Hash containing `username` and `password` Strings used for Basic authentication.

Other options will be passed to either [jQuery.ajax()](http://api.jquery.com/jquery.ajax/) (in browser) or [request](https://github.com/request/request#requestoptions-callback) (in Node.js).

`jolokia.request(request, options)`

Perform arbitrary JMX request or requests.

`request` *`Object|Array`* Definition of JMX requests.

`request.type` *`String`* Type of JMX request. Can be one of `read`, `write`, `exec`, `search` and `list`.

`request.mbean` *`String`* JMX bean name (or name regex for `search` requests).

`request.attribute` *`String|Array`* Name of bean attribute, used for `read` and `write` requests.

`request.value` *`Object`* Value of bean attribute, used for `write` requests.

`request.operation` *`String`* Name of bean operation, used for `exec` requests.

`request.arguments` *`Array`* Arguments for operation, used for `exec` requests.

`request.path` *`String`* Path to append to url to access inner attributes of responses. See official documentation for more information on accessing inner paths.

**Returns** Promise resolved with JMX responses.

`jolokia.get(mbean, attribute, options)`

Sharthand method for creating `read` requests.

**Returns** Promise resolved with attribute value.

`jolokia.set(mbean, attribute, value, options)`

Sharthand method for creating `write` requests.

**Returns** Promise.

`jolokia.list(options)`

Sharthand method for creating `list` requests.

**Returns** Promise resolved with hash containing available JMX domains.

`jolokia.search(mbean, options)`

Sharthand method for creating `search` requests.

**Returns** Promise resolved with array of available JMX beans.

`jolokia.version(options)`

Sharthand method for creating `version` requests.

**Returns** Promise resolved with Jolokia agent version definition.
