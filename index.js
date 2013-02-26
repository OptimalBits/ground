// We need to declare underscore as global, since typescript currently
// does not allow us to generate a single file CommonJS module with imports.
_ = require('underscore');
module.exports = require('./dist/gnd-server');
