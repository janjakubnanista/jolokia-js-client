'use strict';

var expect = require('expect.js');
var q = require('q');
var Jolokia = require('../../src/common/jolokia');

describe('Jolokia', function () {
    var request, response;

    var okResponse = {
        status: 200,
        timestamp: Date.now(),
        request: {},
        value: {}
    };

    var badResponse = {
        status: 400,
        timestamp: Date.now(),
        request: {},
        value: {}
    };

    var call = function(callback) {
        callback();
    };

    beforeEach(function() {
        response = okResponse;
        request = null;

        this.url = '/jolokia/url';
        this.jolokia = new Jolokia({
            url: this.url,
            headers: {
                xHeader: 'xValue'
            }
        });

        this.jolokia.httpRequest = function(httpRequest) {
            request = httpRequest;

            return q(response);
        };
    });

    afterEach(function() {
        delete this.url;
        delete this.jolokia;
    });

    describe('statics', function() {
        describe('isError', function() {
            it('should return false if status property of response object is 200', function() {
                expect(Jolokia.isError({ status: 200 })).to.be(false);
            });

            it('should return true if status property of response object is not 200', function() {
                expect(Jolokia.isError({ status: 300 })).to.be(true);
                expect(Jolokia.isError({ status: 400 })).to.be(true);
                expect(Jolokia.isError({ status: 500 })).to.be(true);
            });
        });

        describe('escape', function() {
            it('should escape ! in URL and encode', function() {
                expect(Jolokia.escape('bean:some!weird!bean!')).to.be('bean%3Asome!!weird!!bean!!');
            });

            it('should escape / in URL and encode', function() {
                expect(Jolokia.escape('bean:some/weird/bean/')).to.be('bean%3Asome!%2Fweird!%2Fbean!%2F');
            });

            it('should escape " in URL and encode', function() {
                expect(Jolokia.escape('bean:some"weird"bean"')).to.be('bean%3Asome!%22weird!%22bean!%22');
            });
        });

        describe('toString', function() {
            it('should turn null into [null]', function() {
                expect(Jolokia.toString(null)).to.be('[null]');
            });

            it('should turn undefined into [null]', function() {
                expect(Jolokia.toString(undefined)).to.be('[null]');
            });

            it('should turn empty string into string ""', function() {
                expect(Jolokia.toString('')).to.be('""');
            });

            it('should return original string', function() {
                expect(Jolokia.toString('ole')).to.be('ole');
            });

            it('should turn array into comma separated list of values converted by Jolokia.toString', function() {
                expect(Jolokia.toString(['ole', '', null])).to.be('ole,"",[null]');
            });
        });
    });

    describe('constructor', function() {
        it('should accept options hash', function() {
            var jolokia = new Jolokia({ url: this.url });
            expect(jolokia.options()).to.eql({ url: this.url });
        });

        it('should accept URL string', function() {
            var jolokia = new Jolokia(this.url);
            expect(jolokia.options()).to.eql({ url: this.url });
        });
    });

    describe('request', function() {
        it('should combine options with default ones', function(done) {
            this.jolokia.request({
                type: 'read',
                mbean: 'java.lang:type=Memory'
            }, {
                method: 'get'
            }).done(function() {
                expect(request.method).to.be('get');
                expect(request.headers.xHeader).to.be('xValue');

                done();
            });
        });

        describe('HTTP method', function() {
            describe('when passed as an option', function() {
                it('should be left unmodified', function(done) {
                    this.jolokia.request({
                        type: 'read',
                        mbean: 'java.lang:type=Memory'
                    }, {
                        method: 'post'
                    }).done(function() {
                        expect(request.method).to.be('post');

                        done();
                    });
                });

                describe('set to `get`', function() {
                    it('should cause an exception with multiple requests', function() {
                        expect(function() {
                            this.jolokia.request([
                                {type: 'read', mbean: 'java.lang:type=Memory'},
                                {type: 'read', mbean: 'java.lang:type=Memory'}
                            ], {
                                method: 'get'
                            });
                        }.bind(this)).to.throwException();
                    });

                    it('should cause an exception if request has config', function() {
                        expect(function() {
                            this.jolokia.request({
                                type: 'read',
                                mbean: 'java.lang:type=Memory',
                                config: {
                                    maxObjects: 100
                                }
                            }, {
                                method: 'get'
                            });
                        }.bind(this)).to.throwException();
                    });

                    it('should cause an exception if multiple attributes are to be read', function() {
                        expect(function() {
                            this.jolokia.request({
                                type: 'read',
                                mbean: 'java.lang:type=Memory',
                                attribute: ['HeapMemoryUsage']
                            }, {
                                method: 'get'
                            });
                        }.bind(this)).to.throwException();
                    });

                    it('should cause an exception in proxy mode', function() {
                        expect(function() {
                            this.jolokia.request({
                                type: 'read',
                                mbean: 'java.lang:type=Memory',
                                target: {
                                    url: 'service:jmx:rmi:///jndi/rmi://targethost:9999/jmxrmi'
                                }
                            }, {
                                method: 'get'
                            });
                        }.bind(this)).to.throwException();
                    });

                    it('should cause request.data to be empty', function(done) {
                        this.jolokia.request({
                            type: 'read',
                            mbean: 'java.lang:type=Memory'
                        }, {
                            method: 'get'
                        }).done(function() {
                            expect(request.data).to.not.be.ok();

                            done();
                        });
                    });
                }); // GET

                describe('set to `post`', function() {
                    it('should cause JSON encoded request to be set to request.data', function(done) {
                        this.jolokia.request({
                            type: 'read',
                            mbean: 'java.lang:type=Memory'
                        }, {
                            method: 'post'
                        }).done(function() {
                            expect(JSON.parse(request.data)).to.eql({
                                type: 'read',
                                mbean: 'java.lang:type=Memory'
                            });

                            done();
                        });
                    });
                }); // POST

                describe('set to different value', function() {
                    it('should cause an exception', function() {
                        expect(function() {
                            this.jolokia.request({
                                type: 'read',
                                mbean: 'java.lang:type=Memory'
                            }, {method: 'put'});
                        }.bind(this)).to.throwException();
                    });
                }); // other
            });

            describe('when detected based on request', function() {
                it('should be GET with single request for single attribute', function(done) {
                    this.jolokia.request({type: 'read', mbean: 'java.lang:type=Memory'}).done(function() {
                        expect(request.method).to.be('get');

                        done();
                    });
                });

                it('should be POST with multiple requests', function(done) {
                    this.jolokia.request([
                        {type: 'read', mbean: 'java.lang:type=Memory'},
                        {type: 'read', mbean: 'java.lang:type=Memory'}
                    ]).done(function() {
                        expect(request.method).to.be('post');

                        done();
                    });
                });

                it('should be POST if request has config', function(done) {
                    this.jolokia.request({
                        type: 'read',
                        mbean: 'java.lang:type=Memory',
                        config: {
                            maxObjects: 100
                        }
                    }).done(function() {
                        expect(request.method).to.be('post');

                        done();
                    });
                });

                it('should be POST if multiple attributes are to be read', function(done) {
                    this.jolokia.request({
                        type: 'read',
                        mbean: 'java.lang:type=Memory',
                        attribute: ['HeapMemoryUsage']
                    }).done(function() {
                        expect(request.method).to.be('post');

                        done();
                    });
                });

                it('should be POST in proxy mode', function(done) {
                    this.jolokia.request({
                        type: 'read',
                        mbean: 'java.lang:type=Memory',
                        target: {
                            url: 'service:jmx:rmi:///jndi/rmi://targethost:9999/jmxrmi'
                        }
                    }).done(function() {
                        expect(request.method).to.be('post');

                        done();
                    });
                });
            });
        }); // HTTP method

        describe('url', function() {
            it('should cause an exception if not specified', function() {
                expect(function() {
                    var jolokia = new Jolokia();

                    jolokia.request({
                        type: 'read',
                        mbean: 'java.lang:type=Memory'
                    });
                }).to.throwException();
            });

            it('should be suffixed with /', function(done) {
                this.jolokia.request({
                    type: 'read',
                    mbean: 'java.lang:type=Memory'
                }, {
                    method: 'post'
                }).done(function() {
                    expect(request.url).to.be('/jolokia/url/');

                    done();
                });
            });

            it('should be suffixed with REST path for get requests', function(done) {
                this.jolokia.request({
                    type: 'read',
                    mbean: 'java.lang:type=Memory'
                }).done(function() {
                    expect(request.url).to.be('/jolokia/url/read/java.lang%3Atype%3DMemory/');

                    done();
                });
            });

            it('should have options.query merged', function(done) {
                this.jolokia.request({
                    type: 'read',
                    mbean: 'java.lang:type=Memory'
                }, {
                    query: {
                        key: 'value'
                    }
                }).done(function() {
                    expect(request.url).to.be('/jolokia/url/read/java.lang%3Atype%3DMemory/?key=value');

                    done();
                });
            });
        }); // url
    }); // request

    describe('get', function() {
        it('should use HTTP GET by default', function(done) {
            this.jolokia.get('java.lang:type=Memory', 'used').done(function() {
                expect(request.method).to.be('get');

                done();
            });
        });

        it('should call request method', function(done) {
            this.jolokia.get('java.lang:type=Memory', 'used').done(function() {
                expect(request.url).to.be('/jolokia/url/read/java.lang%3Atype%3DMemory/used/');

                done();
            });
        });

        it('should reject if response status is not 200', function(done) {
            response = badResponse;

            this.jolokia.get('java.lang:type=Memory', 'used').then(null, call(done));
        });

        it('should accept options', function(done) {
            this.jolokia.get('java.lang:type=Memory', 'used', { method: 'post' }).done(function() {
                expect(request.method).to.be('post');

                done();
            });
        });

        it('should accept path', function(done) {
            this.jolokia.get('java.lang:type=Memory', 'used', 'some/path').done(function() {
                expect(request.url).to.be('/jolokia/url/read/java.lang%3Atype%3DMemory/used/some/path');

                done();
            });
        });

        it('should accept path and options', function(done) {
            this.jolokia.get('java.lang:type=Memory', 'used', 'some/path', { timeout: 34567 }).done(function() {
                expect(request.url).to.be('/jolokia/url/read/java.lang%3Atype%3DMemory/used/some/path');
                expect(request.timeout).to.be(34567);

                done();
            });
        });
    }); // get

    describe('set', function() {
        it('should use HTTP GET by default', function(done) {
            this.jolokia.set('java.lang:type=Memory', 'used', 756).done(function() {
                expect(request.method).to.be('get');

                done();
            });
        });

        it('should call request method', function(done) {
            this.jolokia.set('java.lang:type=Memory', 'used', 756).done(function() {
                expect(request.url).to.be('/jolokia/url/write/java.lang%3Atype%3DMemory/used/756/');

                done();
            });
        });

        it('should reject if response status is not 200', function(done) {
            response = badResponse;

            this.jolokia.set('java.lang:type=Memory', 'used', 756).then(null, call(done));
        });

        it('should accept options', function(done) {
            this.jolokia.set('java.lang:type=Memory', 'used', 756, { timeout: 34567 }).done(function() {
                expect(request.timeout).to.be(34567);

                done();
            });
        });

        it('should accept path', function(done) {
            this.jolokia.set('java.lang:type=Memory', 'used', 756, 'some/path').done(function() {
                expect(request.url).to.be('/jolokia/url/write/java.lang%3Atype%3DMemory/used/756/some/path');

                done();
            });
        });

        it('should accept path and options', function(done) {
            this.jolokia.set('java.lang:type=Memory', 'used', 756, 'some/path', { timeout: 34567 }).done(function() {
                expect(request.url).to.be('/jolokia/url/write/java.lang%3Atype%3DMemory/used/756/some/path');
                expect(request.timeout).to.be(34567);

                done();
            });
        });
    }); // set

    describe('execute', function() {
        it('should use HTTP GET by default', function(done) {
            this.jolokia.execute('java.lang:type=Memory', 'clear').done(function() {
                expect(request.method).to.be('get');

                done();
            });
        });

        it('should call request method', function(done) {
            this.jolokia.execute('java.lang:type=Memory', 'clear').done(function() {
                expect(request.url).to.be('/jolokia/url/exec/java.lang%3Atype%3DMemory/clear/');

                done();
            });
        });

        it('should reject if response status is not 200', function(done) {
            response = badResponse;

            this.jolokia.execute('java.lang:type=Memory', 'clear').then(null, call(done));
        });

        it('should accept options', function(done) {
            this.jolokia.execute('java.lang:type=Memory', 'clear', { timeout: 34567 }).done(function() {
                expect(request.timeout).to.be(34567);

                done();
            });
        });

        it('should accept arguments', function(done) {
            this.jolokia.execute('java.lang:type=Memory', 'clear', 'all', 'the', 'memory').done(function() {
                expect(request.url).to.be('/jolokia/url/exec/java.lang%3Atype%3DMemory/clear/all/the/memory/');

                done();
            });
        });

        it('should accept arguments and options', function(done) {
            this.jolokia.execute('java.lang:type=Memory', 'clear', 'all', 'the', 'memory', { timeout: 34567 }).done(function() {
                expect(request.timeout).to.be(34567);
                expect(request.url).to.be('/jolokia/url/exec/java.lang%3Atype%3DMemory/clear/all/the/memory/');

                done();
            });
        });
    }); // execute

    describe('search', function() {
        it('should use HTTP GET by default', function(done) {
            this.jolokia.search('java.lang:type=*').done(function() {
                expect(request.method).to.be('get');

                done();
            });
        });

        it('should call request method', function(done) {
            this.jolokia.search('java.lang:type=*').done(function() {
                expect(request.url).to.be('/jolokia/url/search/java.lang%3Atype%3D*/');

                done();
            });
        });

        it('should reject if response status is not 200', function(done) {
            response = badResponse;

            this.jolokia.search('java.lang:type=*').then(null, call(done));
        });

        it('should accept options', function(done) {
            this.jolokia.search('java.lang:type=Memory', { timeout: 34567 }).done(function() {
                expect(request.timeout).to.be(34567);

                done();
            });
        });
    }); // search

    describe('version', function() {
        it('should use HTTP GET by default', function(done) {
            this.jolokia.version().done(function() {
                expect(request.method).to.be('get');

                done();
            });
        });

        it('should call request method', function(done) {
            this.jolokia.version().done(function() {
                expect(request.url).to.be('/jolokia/url/version/');

                done();
            });
        });

        it('should reject if response status is not 200', function(done) {
            response = badResponse;

            this.jolokia.version().then(null, call(done));
        });

        it('should accept options', function(done) {
            this.jolokia.version({ timeout: 34567 }).done(function() {
                expect(request.timeout).to.be(34567);

                done();
            });
        });
    }); // version

    describe('list', function() {
        it('should use HTTP GET by default', function(done) {
            this.jolokia.list().done(function() {
                expect(request.method).to.be('get');

                done();
            });
        });

        it('should call request method', function(done) {
            this.jolokia.list().done(function() {
                expect(request.url).to.be('/jolokia/url/list/');

                done();
            });
        });

        it('should reject if response status is not 200', function(done) {
            response = badResponse;

            this.jolokia.list().then(null, call(done));
        });

        it('should accept options', function(done) {
            this.jolokia.list({ timeout: 34567 }).done(function() {
                expect(request.timeout).to.be(34567);

                done();
            });
        });

        it('should accept path', function(done) {
            this.jolokia.list('some/path').done(function() {
                expect(request.url).to.be('/jolokia/url/list/some/path');

                done();
            });
        });

        it('should accept path and options', function(done) {
            this.jolokia.list('some/path', { timeout: 34567 }).done(function() {
                expect(request.url).to.be('/jolokia/url/list/some/path');
                expect(request.timeout).to.be(34567);

                done();
            });
        });
    }); // set
}); // Jolokia
