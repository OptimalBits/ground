
var 
  Gnd = require('gnd'),
  path = require('path');

module.exports = function(grunt) {
  
  var routes = 
    grunt.file.expand({cwd: "app"}, "routes/**/*.js").map(function(file){
      return path.join(path.dirname(file), path.basename(file, '.js'))
    });

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ['build'],
    requirejs: {
      app: {
        options: {
          baseUrl: "./app",
          name: "app",
          include: routes,
          useStrict: true,
          out: "build/app.js",
          paths: {
            "underscore": Gnd.third.underscore,
            "gnd": Gnd.amd
          },
          optimize: "uglify2" 
        }
      },
    },
    copy: {
      main: {
        files: [
          {expand: true, cwd: "app", src: ['index.html',
                                           'assets/**',
                                           'lib/**'], dest: 'build/'},
          {expand: true,
           cwd: path.dirname(Gnd.third.curl), 
           src: [path.basename(Gnd.third.curl)], 
           dest:'build/lib/'},
           {expand: true,
            cwd: path.dirname(Gnd.third.underscore), 
            src: [path.basename(Gnd.third.underscore)], 
            dest:'build/lib/'},
        ]
      }
    },
    compress: {
      main: {
        options: {
          mode: 'gzip',
          level: 9
        },
        expand: true,
        src: ['build/app.js'],
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-compress');
  
  // Default task(s).
  grunt.registerTask('default', ['clean', 'requirejs', 'copy', 'compress']);
};
