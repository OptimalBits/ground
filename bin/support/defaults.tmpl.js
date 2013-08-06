/**
  Defaults configuration object.

  Edit the defaults values to be used when no environment variable is
  available.
  
  Note: this are just defaults for convenience, in production you should
  specify real environment variables:
  
  http://www.12factor.net/config
*/

module.exports = {
  
  //
  // Prefix for all the environment variables, for example, 
  // prefix 'GND' will require APP_PORT to be defined as GND_APP_PORT
  //
  prefix: 'GND',
  
  //
  // Port to be used by the server, 0 means auto.
  //
  APP_PORT: 0,
  
  //
  // Redis port.
  //
  REDIS_PORT: 6379,
  
  //
  // Redis Address
  //
  REDIS_ADDR: '127.0.0.1',
  
  //
  // Mongo URI. 
  // 
  MONGODB_URI: 'mongodb://localhost/ground',
  
  //
  // Mongo URI when running unit tests
  //
  MONGODB_TEST_URI: 'mongodb://localhost/groundTest',
  
  //
  // Name of the cookie to use when enabling sessions.
  //
  COOKIE: 'gnd-cookie'
}
