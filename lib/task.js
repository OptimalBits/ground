var Gnd;
(function (Gnd) {
    var TaskQueue = (function () {
        function TaskQueue() {
            this.tasks = [];
            this.endPromise = new Promise();
        }
        TaskQueue.prototype.append = function () {
            var tasks = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                tasks[_i] = arguments[_i + 0];
            }
            if(this.isEnded) {
                throw new Error("TaskQueue already ended");
            }
            this.tasks.push.apply(this.tasks, _.compact(tasks));
            this.executeTasks();
            return this;
        };
        TaskQueue.prototype.cancel = function () {
            this.isCancelled = true;
        };
        TaskQueue.prototype.end = function () {
            this.isEnded = true;
            if(!this.isExecuting) {
                this.endPromise.resolve();
            }
            return this;
        };
        TaskQueue.prototype.wait = function (cb) {
            this.endPromise.then(cb);
        };
        TaskQueue.prototype.executeTasks = function () {
            var _this = this;
            if(this.tasks.length > 0 && !this.isCancelled && !this.isExecuting) {
                this.isExecuting = true;
                var fn = this.tasks.splice(0, 1)[0];
                fn(function () {
                    _this.isExecuting = false;
                    _this.executeTasks();
                });
            } else {
                if(this.isEnded || this.isCancelled) {
                    this.endPromise.resolve(this.isCancelled);
                }
            }
        };
        return TaskQueue;
    })();
    Gnd.TaskQueue = TaskQueue;    
    var Promise = (function () {
        function Promise() {
            this.callbacks = [];
        }
        Promise.prototype.then = function (cb) {
            if(this.resolved) {
                this.fire(cb);
            } else {
                this.callbacks.push(cb);
            }
        };
        Promise.prototype.resolve = function () {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                args[_i] = arguments[_i + 0];
            }
            if(this.isAborted) {
                return;
            }
            this.resolved = args;
            this.fireCallbacks();
        };
        Promise.prototype.abort = function () {
            this.isAborted = true;
        };
        Promise.prototype.fire = function (cb) {
            cb.apply(this, this.resolved);
        };
        Promise.prototype.fireCallbacks = function () {
            var len = this.callbacks.length;
            if(len > 0) {
                for(var i = 0; i < len; i++) {
                    this.fire(this.callbacks[i]);
                }
            }
        };
        return Promise;
    })();
    Gnd.Promise = Promise;    
    var PromiseQueue = (function () {
        function PromiseQueue() {
            var promises = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                promises[_i] = arguments[_i + 0];
            }
            this.promises = promises;
        }
        PromiseQueue.prototype.abort = function () {
            _.invoke(this.promises, 'abort');
        };
        PromiseQueue.prototype.then = function (cb) {
            Gnd.Util.asyncForEachSeries(this.promises, function (promise, done) {
                promise && promise.then(done);
            }, cb);
        };
        return PromiseQueue;
    })();
    Gnd.PromiseQueue = PromiseQueue;    
})(Gnd || (Gnd = {}));
