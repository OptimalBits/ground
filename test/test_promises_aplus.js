var promisesAplusTests = require("promises-aplus-tests");
var Gnd = require("../");

var adapter = {}

adapter.deferred = function () {
  var promise = new Gnd.Promise();
  
//  console.log(promise)
  
	return {
    promise: promise,
		resolve: promise.resolve.bind(promise),
		reject: promise.reject.bind(promise)
	};
};

promisesAplusTests(adapter, { reporter: "spec" }, function (err) {
    // All done; output is in the console. Or check `err` for number of failures.
});
