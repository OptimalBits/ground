#!/usr/bin/env node
"use strict";

var gnd = require('gnd') 
  , program = require('commander')
  , mkdirp = require('mkdirp')
  , pkg = require('../package.json')
  , version = pkg.version
  , path = require('path')
  , fs = require('fs');
    
program
  .version(version)
  .usage('[options] path')
  .option('-s, --sessions', 'add session support')
  .option('-r, --rights', 'add rights management support')
  .option('-a, --addon', 'create an Add-On')
  .option('-b, --verbose', 'show useful information')
  .option('-f, --force', 'force on non-empty directory')
  .parse(process.argv);
  
// Path

var appPath = program.args.shift() || '.';
var fullPath = path.join(process.cwd(), appPath);

isDirectoryEmpty(appPath, function(isEmpty){
  if(isEmpty || program.force){
    createApplication(appPath, program, function(){
      console.log('Your Ground application is ready at ' + fullPath);
    });
  }else{
    console.log("Error: Cannot create application on non-empty directory.");
    console.log("Use -f to force creation overwriting existing files.\n")
  }
});

function createApplication(dst, opts, cb)
{
  opts.verbose && console.log("Creating application structure in: "+fullPath);
  
  //
  // Create Directory structure
  //
  
  var paths = [
    'app',
    'app/routes',
    'app/views',
    'app/models',
    'app/ctrls',
    'app/lib',
    'app/assets',
    'app/assets/css',
    'app/assets/images',
    'app/assets/templates',
    'test',
  ];
  
  for(var i=0; i<paths.length; i++){
    var dir = path.join(dst, paths[i]);
    opts.verbose && console.log("Creating directory: "+dir);
    mkdir(dir);
  }
  
  //
  // Compile templates and copy them to their proper places.
  //
  
  var filesToCopy = {
    'support/config.tmpl.js': '/config.js',
    'support/server.tmpl.js': '/server.js',
    'support/package.tmpl.json': '/package.json',
    'support/Gruntfile.js': '/Gruntfile.js',
    'support/test_main.tmpl.js': '/test/main.js',
    'support/index.tmpl.html': '/app/index.html',
    'support/app.tmpl.js': '/app/app.js',
    'support/models.tmpl.js': '/models/models.js',
    'support/models/models.js': '/app/models/models.js',
    'support/models/animal.js': '/app/models/animal.js',
    'support/models/zoo.js': '/app/models/zoo.js',
    'support/README.tmpl.md': '/README.md',
    'support/assets/templates/build.html': '/app/assets/templates/build.html',
    'support/assets/templates/configure.html': '/app/assets/templates/configure.html',
    'support/assets/templates/models.html': '/app/assets/templates/models.html',
    'support/assets/templates/routes.html': '/app/assets/templates/routes.html',
    'support/assets/templates/views.html': '/app/assets/templates/views.html',
    'support/assets/templates/welcome.html': '/app/assets/templates/welcome.html',
    'support/routes/main.js': '/app/routes/main.js',
    'support/routes/configure.js': '/app/routes/configure.js',
  }
  
  var taskQueue = new gnd.TaskQueue();
  
  for(var src in filesToCopy){
    (function(src){
      taskQueue.append(function(cb){
        var dstFile = path.join(dst, filesToCopy[src]);
        opts.verbose && console.log("Adding "+src+" to "+dstFile);
        cp(path.join(__dirname, src), dstFile, cb);
      });
    })(src);
  }
  
  taskQueue.wait(cb);
}

//
//  File Utils
//

function mkdir(path){
  mkdirp.sync(path, '0755');
}

// Copy overwriting destination
function cp(src, dst, cb) {
  var util = require('util');
  var is, os;

  fs.stat(src, function (err) {
    if (err) {
      return cb(err);
    }
    is = fs.createReadStream(src);
    os = fs.createWriteStream(dst);
    util.pump(is, os, cb);
  });
};

function isDirectoryEmpty(path, fn) {
  fs.readdir(path, function(err, files){
    if (err && 'ENOENT' != err.code) throw err;
    fn(!files || !files.length);
  });
}


