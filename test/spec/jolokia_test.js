'use strict';

describe('Jolokia JavaScript Client', function () {
    beforeEach(function() {
        this.okResponse = {
            status: 200,
            timestamp: Date.now(),
            request: {},
            value: {}
        };

        this.badResponse = {
            status: 400,
            timestamp: Date.now(),
            request: {},
            value: {}
        };

        sinon.stub($, 'ajax', function(request) {
            this.request = request;

            var deferred = new $.Deferred();

            deferred.resolve(this.response || this.okResponse);

            return deferred.promise();
        }.bind(this));

        this.url = '/jolokia/url/';
        this.jolokia = new Jolokia(this.url);
    });

    afterEach(function() {
        $.ajax.restore();

        delete this.request;
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
        it('should combine options with default ones', function() {
            var jolokia = new Jolokia({
                url: this.url,
                method: 'post'
            });

            jolokia.request({
                type: 'read',
                mbean: 'java.lang:type=Memory'
            }, {
                method: 'post'
            });

            expect(this.request.type).to.be('post');
            expect(this.request.url).to.be(this.url);
        });

        describe('HTTP method', function() {
            describe('when passed as an option', function() {
                it('should be left unmodified', function() {
                    this.jolokia.request({
                        type: 'read',
                        mbean: 'java.lang:type=Memory'
                    }, {
                        method: 'post'
                    });

                    expect(this.request.type).to.be('post');
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

                    it('should cause request.data to be empty', function() {
                        this.jolokia.request({
                            type: 'read',
                            mbean: 'java.lang:type=Memory'
                        }, {
                            method: 'get'
                        });

                        expect(this.request.data).to.not.be.ok();
                    });
                }); // GET

                describe('set to `post`', function() {
                    it('should cause an exception in JSONP mode', function() {
                        expect(function() {
                            this.jolokia.request({
                                type: 'read',
                                mbean: 'java.lang:type=Memory'
                            }, {method: 'post', jsonp: true});
                        }.bind(this)).to.throwException();
                    });

                    it('should cause JSON encoded request to be set to request.data', function() {
                        this.jolokia.request({
                            type: 'read',
                            mbean: 'java.lang:type=Memory'
                        }, {
                            method: 'post'
                        });

                        expect(JSON.parse(this.request.data)).to.eql({
                            type: 'read',
                            mbean: 'java.lang:type=Memory'
                        });
                    });
                }); // POST

                describe('set to `auto`', function() {
                    it('should be guessed', function() {
                        this.jolokia.request({
                            type: 'read',
                            mbean: 'java.lang:type=Memory'
                        }, {
                            method: 'auto'
                        });

                        expect(this.request.type).to.be('get');
                    });
                }); // auto

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
                it('should be GET with single request for single attribute', function() {
                    this.jolokia.request({type: 'read', mbean: 'java.lang:type=Memory'});

                    expect(this.request.type).to.be('get');
                });

                it('should be POST with multiple requests', function() {
                    this.jolokia.request([
                        {type: 'read', mbean: 'java.lang:type=Memory'},
                        {type: 'read', mbean: 'java.lang:type=Memory'}
                    ]);

                    expect(this.request.type).to.be('post');
                });

                it('should be POST if request has config', function() {
                    this.jolokia.request({
                        type: 'read',
                        mbean: 'java.lang:type=Memory',
                        config: {
                            maxObjects: 100
                        }
                    });

                    expect(this.request.type).to.be('post');
                });

                it('should be POST if multiple attributes are to be read', function() {
                    this.jolokia.request({
                        type: 'read',
                        mbean: 'java.lang:type=Memory',
                        attribute: ['HeapMemoryUsage']
                    });

                    expect(this.request.type).to.be('post');
                });

                it('should be POST in proxy mode', function() {
                    this.jolokia.request({
                        type: 'read',
                        mbean: 'java.lang:type=Memory',
                        target: {
                            url: 'service:jmx:rmi:///jndi/rmi://targethost:9999/jmxrmi'
                        }
                    });

                    expect(this.request.type).to.be('post');
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

            it('should be suffixed with /', function() {
                var jolokia = new Jolokia('/jolokia/url');

                jolokia.request({
                    type: 'read',
                    mbean: 'java.lang:type=Memory'
                }, {
                    method: 'post'
                });

                expect(this.request.url).to.be('/jolokia/url/');
            });

            it('should be suffixed with REST path for get requests', function() {
                this.jolokia.request({
                    type: 'read',
                    mbean: 'java.lang:type=Memory'
                });

                expect(this.request.url).to.be('/jolokia/url/read/java.lang%3Atype%3DMemory/');
            });
        }); // url

        describe('authentication', function() {
            it('should send Authorization header on request', function() {
                this.jolokia.request({
                    type: 'read',
                    mbean: 'java.lang:type=Memory'
                }, {
                    username: 'jan',
                    password: 'nanista'
                });

                expect(this.request.headers.Authorization).to.be('Basic amFuOm5hbmlzdGE=');
                expect(this.request.xhrFields.withCredentials).to.be(true);
            });
        }); // authentication
    }); // request

    describe('get', function() {
        it('should use HTTP GET by default', function() {
            this.jolokia.get('java.lang:type=Memory', 'used');

            expect(this.request.type).to.be('get');
        });

        it('should call request method', function() {
            this.jolokia.get('java.lang:type=Memory', 'used');

            expect(this.request.url).to.be('/jolokia/url/read/java.lang%3Atype%3DMemory/used/');
        });

        it('should reject if response status is not 200', function() {
            var spy = sinon.spy();
            this.response = this.badResponse;

            this.jolokia.get('java.lang:type=Memory', 'used').then(null, spy);

            expect(spy.calledOnce).to.be(true);
        });

        it('should accept options', function() {
            this.jolokia.get('java.lang:type=Memory', 'used', { method: 'post' });

            expect(this.request.type).to.be('post');
        });

        it('should accept path', function() {
            this.jolokia.get('java.lang:type=Memory', 'used', 'some/path');

            expect(this.request.url).to.be('/jolokia/url/read/java.lang%3Atype%3DMemory/used/some/path');
        });

        it('should accept path and options', function() {
            this.jolokia.get('java.lang:type=Memory', 'used', 'some/path', { timeout: 34567 });

            expect(this.request.url).to.be('/jolokia/url/read/java.lang%3Atype%3DMemory/used/some/path');
            expect(this.request.timeout).to.be(34567);
        });
    }); // get

    describe('set', function() {
        it('should use HTTP GET by default', function() {
            this.jolokia.set('java.lang:type=Memory', 'used', 756);

            expect(this.request.type).to.be('get');
        });

        it('should call request method', function() {
            this.jolokia.set('java.lang:type=Memory', 'used', 756);

            expect(this.request.url).to.be('/jolokia/url/write/java.lang%3Atype%3DMemory/used/756/');
        });

        it('should reject if response status is not 200', function() {
            var spy = sinon.spy();
            this.response = this.badResponse;

            this.jolokia.set('java.lang:type=Memory', 'used', 756).then(null, spy);

            expect(spy.calledOnce).to.be(true);
        });

        it('should accept options', function() {
            this.jolokia.set('java.lang:type=Memory', 'used', 756, { timeout: 34567 });

            expect(this.request.timeout).to.be(34567);
        });

        it('should accept path', function() {
            this.jolokia.set('java.lang:type=Memory', 'used', 756, 'some/path');

            expect(this.request.url).to.be('/jolokia/url/write/java.lang%3Atype%3DMemory/used/756/some/path');
        });

        it('should accept path and options', function() {
            this.jolokia.set('java.lang:type=Memory', 'used', 756, 'some/path', { timeout: 34567 });

            expect(this.request.url).to.be('/jolokia/url/write/java.lang%3Atype%3DMemory/used/756/some/path');
            expect(this.request.timeout).to.be(34567);
        });
    }); // set
    
    describe('execute', function() {
        it('should use HTTP GET by default', function() {
            this.jolokia.execute('java.lang:type=Memory', 'clear');

            expect(this.request.type).to.be('get');
        });

        it('should call request method', function() {
            this.jolokia.execute('java.lang:type=Memory', 'clear');

            expect(this.request.url).to.be('/jolokia/url/exec/java.lang%3Atype%3DMemory/clear/');
        });

        it('should reject if response status is not 200', function() {
            var spy = sinon.spy();
            this.response = this.badResponse;

            this.jolokia.execute('java.lang:type=Memory', 'clear').then(null, spy);

            expect(spy.calledOnce).to.be(true);
        });

        it('should accept options', function() {
            this.jolokia.execute('java.lang:type=Memory', 'clear', { timeout: 34567 });

            expect(this.request.timeout).to.be(34567);
        });

        it('should accept arguments', function() {
            this.jolokia.execute('java.lang:type=Memory', 'clear', 'all', 'the', 'memory');

            expect(this.request.url).to.be('/jolokia/url/exec/java.lang%3Atype%3DMemory/clear/all/the/memory/');
        });

        it('should accept arguments and options', function() {
            this.jolokia.execute('java.lang:type=Memory', 'clear', 'all', 'the', 'memory', { timeout: 34567 });

            expect(this.request.timeout).to.be(34567);
            expect(this.request.url).to.be('/jolokia/url/exec/java.lang%3Atype%3DMemory/clear/all/the/memory/');
        });
    }); // execute

    describe('search', function() {
        it('should use HTTP GET by default', function() {
            this.jolokia.search('java.lang:type=*');

            expect(this.request.type).to.be('get');
        });

        it('should call request method', function() {
            this.jolokia.search('java.lang:type=*');

            expect(this.request.url).to.be('/jolokia/url/search/java.lang%3Atype%3D*/');
        });

        it('should reject if response status is not 200', function() {
            var spy = sinon.spy();
            this.response = this.badResponse;

            this.jolokia.search('java.lang:type=*').then(null, spy);

            expect(spy.calledOnce).to.be(true);
        });

        it('should accept options', function() {
            this.jolokia.search('java.lang:type=Memory', { timeout: 34567 });

            expect(this.request.timeout).to.be(34567);
        });
    }); // search

    describe('version', function() {
        it('should use HTTP GET by default', function() {
            this.jolokia.version();

            expect(this.request.type).to.be('get');
        });

        it('should call request method', function() {
            this.jolokia.version();

            expect(this.request.url).to.be('/jolokia/url/version/');
        });

        it('should reject if response status is not 200', function() {
            var spy = sinon.spy();
            this.response = this.badResponse;

            this.jolokia.version().then(null, spy);

            expect(spy.calledOnce).to.be(true);
        });

        it('should accept options', function() {
            this.jolokia.version({ timeout: 34567 });

            expect(this.request.timeout).to.be(34567);
        });
    }); // version

    describe('list', function() {
        it('should use HTTP GET by default', function() {
            this.jolokia.list();

            expect(this.request.type).to.be('get');
        });

        it('should call request method', function() {
            this.jolokia.list();

            expect(this.request.url).to.be('/jolokia/url/list/');
        });

        it('should reject if response status is not 200', function() {
            var spy = sinon.spy();
            this.response = this.badResponse;

            this.jolokia.list().then(null, spy);

            expect(spy.calledOnce).to.be(true);
        });

        it('should accept options', function() {
            this.jolokia.list({ timeout: 34567 });

            expect(this.request.timeout).to.be(34567);
        });

        it('should accept path', function() {
            this.jolokia.list('some/path');

            expect(this.request.url).to.be('/jolokia/url/list/some/path');
        });

        it('should accept path and options', function() {
            this.jolokia.list('some/path', { timeout: 34567 });

            expect(this.request.url).to.be('/jolokia/url/list/some/path');
            expect(this.request.timeout).to.be(34567);
        });
    }); // set

    describe('poller', function() {
        beforeEach(function() {
            sinon.spy(this.jolokia, 'request');

            this.clock = sinon.useFakeTimers();
        });

        afterEach(function() {
            this.jolokia.request.restore();
            this.clock.restore();
        });

        it('should add job', function() {
            this.jolokia.register({
                type: 'read',
                mbean: 'java.lang:type=Memory'
            });

            this.jolokia.start(1500);

            this.clock.tick(2000);

            expect(this.jolokia.request.calledOnce).to.be(true);
            expect(this.jolokia.request.calledWith({
                type: 'read',
                mbean: 'java.lang:type=Memory'
            })).to.be(true);
        });

        it('should remove job', function() {
            var id = this.jolokia.register({
                type: 'read',
                mbean: 'java.lang:type=Memory'
            });

            this.jolokia.start(1500);

            this.jolokia.unregister(id);

            this.clock.tick(2000);

            expect(this.jolokia.request.called).to.be(false);
        });
    }); // poller
}); // Jolokia
