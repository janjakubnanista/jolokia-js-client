'use strict';

/* globals Jolokia,$ */
/* globals sinon,expect */
describe('Jolokia - browser version', function() {
	describe('httpRequest', function() {
		beforeEach(function() {
			this.jolokia = new Jolokia({});

			sinon.stub($, 'ajax');
		});

		afterEach(function() {
			delete this.jolokia;

			$.ajax.restore();
		});

		it('should add processData: false to options', function() {
			this.jolokia.httpRequest({});

			expect($.ajax.withArgs({ processData: false })).to.be.calledOnce();
		});

		it('should add authorization headers', function() {
			this.jolokia.httpRequest({
				auth: {
					username: 'jan',
					password: 'nanista'
				}
			});

			expect($.ajax.withArgs({
				processData: false,
				xhrFields: {
					withCredentials: true
				},
				headers: {
					Authorization: 'Basic amFuOm5hbmlzdGE='
				}
			})).to.be.calledOnce();
		});
	});
});
