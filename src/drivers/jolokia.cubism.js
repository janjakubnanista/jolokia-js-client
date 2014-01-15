/*global Jolokia*/

var generate = (function() {
    'use strict';

    function isRequest(request) {
        return typeof(request) === 'object' && typeof(request.type) === 'string';
    }

    var generate = function(context) {
        return function() {
            var values = [];

            var args = Array.prototype.slice.call(arguments, 0);
            var formatter = typeof(args[0]) === 'function' ? args.shift() : function(resp) {
                return Number(resp.value);
            };

            var options = isRequest(args[args.length - 1]) ? {} : args.pop();
            var name = typeof(args[args.length - 1]) === 'string' ? args.pop() : options.name;
            var requests = args;

            var metric = context.metric(function (start, stop, step, callback) {
                // Convert start and stop to milliseconds
                start = +start;
                stop = +stop;

                var output = [];
                var valuesLength = values.length;
                var first = valuesLength ? values[0].time : undefined;
                var last = valuesLength ? values[valuesLength - 1].time : undefined;
                var time = start;

                if (!valuesLength || stop < first) {
                    while (time < stop) {
                        output.push(NaN);
                        time += step;
                    }
                } else {
                    while (time < first && time < stop) {
                        output.push(NaN);
                        time += step;
                    }

                    var startIndex = 0;

                    while (values[startIndex].time < start && startIndex < valuesLength) {
                        startIndex++;
                    }

                    while (time < stop && time < last && startIndex < valuesLength) {
                        output.push(values[startIndex].value);
                        
                        time += step;
                        startIndex++;
                    }

                    while (time < stop) {
                        output.push(NaN);
                        time += step;
                    }

                    if (valuesLength > context.width) {
                        values.splice(valuesLength - context.width, context.width);
                    }
                }

                callback(null, output);
            }, name);

            if (options.delta) {
                // Use cubism metric chaining for calculating the difference value and keep care that the
                // metric keeps old values up to the delta value
                var shiftedMetric = metric.shift(-options.delta);
                metric = metric.subtract(shiftedMetric);

                if (name) {
                    metric.toString = function () {
                        return name;
                    };
                }
            }

            this.register(requests, {
                success: function(responses) {
                    var errors = responses.filter(Jolokia.isError);

                    values.push({
                        time: Date.now(),
                        value: errors.length ? NaN : formatter.apply(metric, responses)
                    });
                }
            });

            return metric;
        };
    };

    return generate;
})(jQuery);

Jolokia.prototype.cubism = function(context) {
    'use strict';
    
    this.metric = generate(context);

    return this;
};
