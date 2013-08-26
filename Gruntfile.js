module.exports = function(grunt) {
  require('time-grunt')(grunt);

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    typescript: {
      client: {
        src: ['gnd.ts'],
        dest: 'build/gnd.js',
        options: {
          module: 'amd', //or commonjs
          target: 'es3', //or es5
          //base_path: 'path/to/typescript/files',
          sourcemap: true,
          fullSourceMapPath: true,
          declaration: true,
        }
      },
      server: {
        src: ['gnd-server.ts'],
        dest: 'build/gnd-server.js',
        options: {
          module: 'amd', //or commonjs
          target: 'es5',
          //base_path: 'path/to/typescript/files',
          sourcemap: true,
          fullSourceMapPath: true,
          declaration: true,
        }
      }
    },
    uglify: {
      client: {
        files: {'build/gnd.min.js': ['build/gnd.js']},
        options: {
          banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
          compress: {
            warnings: false,
            unsafe: true,
          },
          mangle: true, 
          warnings: false
          // report: 'gzip',
        }
      }
    },
    compress: {
      main: {
        options: {
          mode: 'gzip',
          level: 9
        },
        expand: true,
        //cwd: 'assets/',
        src: ['build/gnd.min.js'],
        dest: 'build/'
      }
    },
    
    // Constants for the Gruntfile so we can easily change the path for
    // our environments.
    BASE_PATH: './',
    DEVELOPMENT_PATH: './',
    
    // The YUIDoc plugin to generate documentation for code files.
    yuidoc: {
      compile: {
        name: '<%= pkg.name %>',
        description: '<%= pkg.description %>',
        version: '<%= pkg.version %>',
        url: '<%= pkg.homepage %>',
        options: {
          extension: '.ts', // Default '.js' <comma-separated list of file extensions>
          paths: '<%= DEVELOPMENT_PATH %>' + 'lib/',
          outdir: '<%= BASE_PATH %>' + 'docs/',
          themedir: "docstheme/gndtheme"
        }
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-typescript');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-yuidoc');

  // Default task(s).
  grunt.registerTask('default', ['typescript', 'uglify', 'compress', 'yuidoc']);
  grunt.registerTask('docs', ['yuidoc']);
  grunt.registerTask('build', ['typescript', 'uglify', 'compress']);
};
