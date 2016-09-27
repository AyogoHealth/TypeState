/*********************************
/* typedfsm.js Grunt Build File
/*********************************/

/*global module:false*/
module.exports = function (grunt) {

   //
   // Project configuration
   //
   grunt.initConfig({
      pkg: grunt.file.readJSON('package.json'),

      //
      // Configure jasmine-node to run Jasmine specs
      //
      jasmine_node: {
        options: {
          specNameMatcher: "Spec", // load only specs containing specNameMatcher
          requirejs: false,
          forceExit: true,
          jUnit: {
              report: false,
              savePath: "./dist/reports/jasmine/",
              useDotNotation: true,
              consolidate: true
          }
        },
        all: ['spec/']
      },

      //
      // Concatenate build files
      // Add banner to files
      //
      concat: {
         main: {
            src: ['dist/<%= pkg.name %>.js'],
            dest: 'dist/<%= pkg.name %>.js',
            sourceMap: true,
            sourceMapStyle: 'inline'
         },
         minified: {
            src: ['dist/<%= pkg.name %>.min.js'],
            dest: 'dist/<%= pkg.name %>.min.js'
         },
         options: {
            separator: '\n;\n',
            banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                    '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                    '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
                    '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %>;' +
                    ' Licensed <%= pkg.license%>*/\n'
         }
      },

      //
      // UglifyJS files
      //
      uglify: {
        main: {
          files: {
            'dist/<%= pkg.name %>.min.js': 'dist/<%= pkg.name %>.js'
          }
        }
      },

      //
      // Watch files
      //
      watch: {
         scripts: {
            files: ['src/*.ts', 'spec/TypeStateSpec.ts'],
            tasks: ['shell:specs', 'jasmine_node'],
            options: {
               interrupt: true
            }
         }
      },

      //
      // Shell Commands
      //
      shell: {

         //
         // Execute TypeScript compiler against Excalibur core
         //
         tsc: {
            command: '$(npm bin)/tsc -p .',
            options: {
               stdout: true,
               failOnError: true
            }
         },

         //
         // TypeScript Compile Jasmine specs
         // TODO: Simplify this so we don't have to always update it every time we add a spec
         //
         specs: {
            command: '$(npm bin)/tsc "./spec/TypeStateSpec.ts" -module commonjs',
            options: {
               stdout: true,
               failOnError: true
            }
         }
      }

   });

   //
   // Load NPM Grunt tasks as dependencies
   //
   grunt.loadNpmTasks('grunt-shell');
   grunt.loadNpmTasks('grunt-contrib-uglify');
   grunt.loadNpmTasks('grunt-contrib-concat');
   grunt.loadNpmTasks('grunt-contrib-copy');
   grunt.loadNpmTasks('grunt-jasmine-node');
   grunt.loadNpmTasks('grunt-contrib-watch');

   //
   // Register available Grunt tasks
   //

   // Run tests
   grunt.registerTask('tests', ['shell:specs', 'jasmine_node']);

   // Default task - compile, test, build dists
   grunt.registerTask('default', ['tests', 'shell:tsc', 'uglify', 'concat']);

   // Travis task - for Travis CI
   grunt.registerTask('travis', 'default');

};
