'use strict';

var sinon = require('sinon');
var expect = require('sinon-expect').enhance(require('expect.js'), sinon, 'was');
var request = require('request');
var Jolokia = require('../../src/node/jolokia');

describe('Jolokia in Node.js', function() {
	beforeEach(function(){
		this.jolokia = new Jolokia({});

		sinon.stub(request, 'get');
		sinon.stub(request, 'post');
	});

	afterEach(function() {
		request.get.restore();
		request.post.restore();

		delete this.options;
		delete this.jolokia;
	});

	describe('httpRequest', function() {
		it('should call request[method]', function() {
			this.jolokia.httpRequest({
				method: 'post'
			});

			expect(request.post).was.calledOnce();

			this.jolokia.httpRequest({
				method: 'get'
			});

			expect(request.get).was.calledOnce();
		});

		it('should call request[method] with options', function() {
			var options = {
				method: 'post',
				url: 'url'
			};

			this.jolokia.httpRequest(options);

			expect(request.post.withArgs(options)).was.calledOnce();
		});

		it('should set options.body to value of options.data and delete options.data', function() {
			var options = {
				method: 'post',
				data: '{"property":"value"}'
			};

			this.jolokia.httpRequest(options);

			expect(request.post.withArgs({
				method: 'post',
				body: '{"property":"value"}'
			})).was.calledOnce();
		});
	});
});
