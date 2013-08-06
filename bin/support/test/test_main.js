/**
  Main file for testing the application.
*/
"use strict";

process.env['TEST'] = true;

//
// Start test server
//
var serverPort = require('../server');

// --
var expect = require('expect.js');

//
// Describe your unit tests here, you can also 'require' unit tests 
// present in other files
//

describe("Models", function(){

  describe("Animal", function(){
    it("have legs", function(){
      // write test
    })
  })

});
