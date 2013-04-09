var promisesAplusTests = require("promises-aplus-tests");
var Gnd = require("../");

var adapter = {}

adapter.pending = function () {
  var promise = new Gnd.Promise();
  
  console.log(promise)
  
	return {
    promise: promise,
		fulfill: promise.resolve.bind(promise),
		reject: promise.reject.bind(promise)
	};
};

promisesAplusTests(adapter, function (err) {
    // All done; output is in the console. Or check `err` for number of failures.
});
