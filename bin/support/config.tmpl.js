/**

  Configuration file.

  Can be editted to add more configuration variables, following the 
  twelve-factor app guidelines:
  
    http://www.12factor.net/config
    
  For adding or changing defaults just edit defaults.js
*/

var env = process.env
  , defaults = require('./defaults.js')
  , prefix = defaults.prefix; 


var config = {
  APP_PORT: _('APP_PORT', defaults.APP_PORT),
  
  REDIS_PORT: _('REDIS_PORT', defaults.REDIS_PORT),
  REDIS_ADDR: _('REDIS_ADDR', defaults.REDIS_ADDR),
  
  MONGODB_URI: _('MONGODB_URI', defaults.MONGODB_URI),
  MONGODB_TEST_URI: _('MONGODB_URI', defaults.MONGODB_TEST_URI),
  
  COOKIE: _('COOKIE', defaults.COOKIE),
  MODE: _('MODE', env.NODE_ENV || defaults.MODE)
}

config.DEVELOPMENT = _('DEVELOPMENT', config.MODE === 'development');
config.MONGODB_URI = env.TEST ? config.MONGODB_TEST_URI : config.MONGODB_URI; 

function _(variable, defaultValue){
  return env[prefix+'_'+variable] || defaultValue;
}

module.exports = config;
