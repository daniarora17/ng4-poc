/* jslint node: true */
/* jshint quotmark:false, indent:false, camelcase:false, maxcomplexity:false, maxstatements:false */
(function () {'use strict';}());

var gruntfileVersion = "2.4";
var aboutGruntfile = "Launchpad Widget Gruntfile";
var avaliblePublicCommands = ['buid:type', 'test', 'serve:from', 'serve-proxy:protocol:ip:port', 'tgz', 'deploy',  'docker-build', 'docker-push', 'fileshare', 'e2e:from:protocol:ip:port:browser', 'about'];

var dashToCamel = function (str) {
  return str.replace(/\W+(.)/g, function (x, chr) {
    return chr.toUpperCase();
  });
};

var camelToDash = function (str) {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
};

var manifest = require('./manifest.json');
var buildNumber = process.env.BUILD_NUMBER;
var version = manifest.app.version.substring(0, manifest.app.version.lastIndexOf('.') + 1) + (buildNumber ? buildNumber : 'dev');
var appName = dashToCamel(manifest['app']['app-id'].split('.')[2]);

var buildType = "normal";
var deployCategory = "cptelmex";
if(manifest.app['deploy-category'] && manifest.app['deploy-category'].length > 0){
  deployCategory = manifest.app['deploy-category'];
}

//Using exclusion patterns slows down Grunt significantly
//instead of creating a set of patterns like '**/*.js' and '!**/node_modules/**'
//this method is used to create a set of inclusive patterns for all subdirectories
//skipping node_modules, bower_components, dist, and any .dirs
//This enables users to create any directory structure they desire.
var createFolderGlobs = function (fileTypePatterns, opt) {
  fileTypePatterns = Array.isArray(fileTypePatterns) ? fileTypePatterns : [fileTypePatterns];

  var ignore = ['node_modules', 'bower_components', 'dist', 'reports', 'temp', 'build'];

  if(opt) {
    if(opt.ignoreDir) {
      ignore = Array.isArray(opt.ignoreDir) ? ignore.concat(opt.ignoreDir) : ignore.concat([opt.ignoreDir]);
    }
  }

  var fs = require('fs');
  return fs.readdirSync(process.cwd())
  .map(function (file) {
    if (ignore.indexOf(file) !== -1 || file.indexOf('.') === 0 || !fs.lstatSync(file).isDirectory()) {
      return null;
    } else {
      return fileTypePatterns.map(function (pattern) {
        return file + '/**/' + pattern;
      });
    }
  })
  .filter(function (patterns) {
    return patterns;
  })
  .concat(fileTypePatterns);
};

module.exports = function (grunt) {

  // load all grunt tasks
  require('load-grunt-tasks')(grunt);

  // Project configuration.
  grunt.initConfig({
    connect: {
      options: {
        port: 9000,
        hostname: 'localhost'
      },
      main: {
        options: {
          open: true,
          middleware: function (connect, options) {
            if (!Array.isArray(options.base)) {
              options.base = [options.base];
            }

            // Setup the proxy
            var middlewares = [require('grunt-connect-proxy/lib/utils').proxyRequest];

            // Serve static files.
            options.base.forEach(function (base) {
              middlewares.push(connect.static(base));
            });

            // Make directory browse-able.
            var directory = options.directory || options.base[options.base.length - 1];
            middlewares.push(connect.directory(directory));

            return middlewares;
          }
        }
      },

      // Proxy backend
      proxies: [{
        // Default host and port
        // github master should be localhost:8080 for e2e mock support by default.
        context: '/api',
        host: 'localhost',
        port: '8080',
        // HTTPS proxy example
        // Replace the default host and port with below host, port, and protocol for HTTPS backend.
        // host: '10.11.8.225',
        // port: '443',
        // protocol: 'https:',
        headers: {
          /*
          A temporary work-arround: To use the following line, you'll need to comment
          out any $http.defaults.headers.common.Authorization line in the project's code
          */
          // 'Authorization': 'Basic QURNSU46UEFTU1dPUkQ='
        }
      }],
      dist: {
        options: {
          open: true,
          base: './dist/',
          middleware: function (connect, options) {
            if (!Array.isArray(options.base)) {
              options.base = [options.base];
            }
            // Setup the proxy
            var middlewares = [require('grunt-connect-proxy/lib/utils').proxyRequest];
            // Serve static files.
            options.base.forEach(function (base) {
              middlewares.push(connect.static(base));
            });
            // Make directory browse-able.
            var directory = options.directory || options.base[options.base.length - 1];
            middlewares.push(connect.directory(directory));
            return middlewares;
          }
        }
      }
    },
    watch: {
      main: {
        options: {
          livereload: true,
          livereloadOnError: false,
          spawn: false
        },
        files: [createFolderGlobs(['*.js', '*.less', '*.html']), '!_SpecRunner.html', '!.grunt'],
        tasks: [] //all the tasks are run dynamically during the watch event handler
      }
    },
    jshint: {
      main: {
        options: {
          jshintrc: '.jshintrc'
        },
        src: createFolderGlobs('*.js')
      }
    },
    clean: {
      before: {
        src: ['dist', 'temp']
      },
      after: {
        src: ['temp']
      },
      deploy: {
        src: [createFolderGlobs(camelToDash(appName)+'*.tgz'), '!snapshots/**', 'launchpad']
      },
      stage: {
        src: ['build/stage/launchpad/apps/'+camelToDash(appName)]
      },
      fonts:{
        src: ['fonts']
      }
    },
    copy: {
      main: {
        files: [
          {
            src: ['img/**'],
            dest: 'dist/'
          },
          {
            src: ['bower_components/font-awesome/fonts/**'],
            dest: 'dist/',
            filter: 'isFile',
            expand: true
          },
          {
            src: ['bower_components/bootstrap/fonts/**'],
            dest: 'dist/',
            filter: 'isFile',
            expand: true
          },
          {
            src: 'fonts/**',
            dest: 'dist/',
            expand: true
          },
          {
            expand: true,
            cwd: './',
            src: ['**/*.less'],
            dest: 'dist/'
          },
          {
            src: ['bower_components/launchpad-icon-library/src/*'],
            dest: 'dist/icons/',
            filter: 'isFile',
            flatten: true,
            expand: true
          }
        ]
      },
      serve: {
        files: [{
          src: ['bower_components/launchpad-icon-library/src/*'],
          dest: 'icons/',
          filter: 'isFile',
          flatten: true,
          expand: true
        }]
      },
      nomin: {
        files: [
          {
            src: 'temp/app.full.js',
            dest: 'dist/app.full.js'
          },
          {
            src: 'temp/app.css',
            dest: 'dist/app.full.css'
          }
        ]
      },
      deploy: {
        files: [
          {
            nonull: true,
            cwd: 'dist/',
            src: '**',
            dest: 'launchpad/apps/'+camelToDash(appName)+'/',
            expand: true
          }
        ]
      },
      stage: {
        files: [
          {
            nonull: true,
            cwd: 'dist/',
            src: '**',
            dest: 'build/stage/launchpad/apps/'+camelToDash(appName)+'/',
            expand: true
          }
        ]
      },
      libraryFonts: {
        files: [
          {
            cwd: 'bower_components/launchpad-component-library/dist/fonts/',
            src: '**',
            dest: 'fonts',
            expand: true
          }
        ]
      }
    },
    concat: {
      main: {
        src: ['<%= dom_munger.data.appjs %>', '<%= ngtemplates.main.dest %>'],
        dest: 'temp/app.full.js'
      }
    },
    htmlmin: {
      main: {
        options: {
          collapseBooleanAttributes: true,
          collapseWhitespace: true,
          removeAttributeQuotes: true,
          removeComments: true,
          removeEmptyAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true
        },
        files: {
          'dist/index.html': 'dist/index.html'
        }
      }
    },
    dom_munger: {
      read: {
        options: {
          read: [
            {
              selector: 'script[data-concat!="false"]',
              attribute: 'src',
              writeto: 'appjs'
            },
            {
              selector: 'link[rel="stylesheet"][data-concat!="false"]',
              attribute: 'href',
              writeto: 'appcss'
            }
          ]
        },
        src: 'index.html'
      },
      update: {
        options: {
          remove: ['script[data-remove!="false"]', 'link[data-remove!="false"]'],
          append: [
            {
              selector: 'body',
              html: '<script src="app.full.min.js"></script>'
            },
            {
              selector: 'head',
              html: '<link rel="stylesheet" href="app.full.min.css">'
            }
          ],
          update: [
            {
              selector: 'script[less="true"]',
              attribute: 'src',
              value: 'less.min.js'
            }
          ]
        },
        src: 'index.html',
        dest: 'dist/index.html'
      },
      updateNoMin: {
        options: {
          remove: ['script[data-remove!="false"]', 'link[data-remove!="false"]'],
          append: [
            {
              selector: 'body',
              html: '<script src="app.full.js"></script>'
            },
            {
              selector: 'head',
              html: '<link rel="stylesheet" href="app.full.css">'
            }
          ],
          update: [
            {
              selector: 'script[less="true"]',
              attribute: 'src',
              value: 'less.min.js'
            }
          ]
        },
        src: 'index.html',
        dest: 'dist/index.html'
      }
    },
    less: {
      production: {
        options: {},
        files: {
          'temp/app.css': 'css_styles.less'
        }
      }
    },
    cssmin: {
      main: {
        src: ['temp/app.css'],
        dest: 'dist/app.full.min.css'
      }
    },
    uglify: {
      main: {
        src: 'temp/app.full.js',
        dest: 'dist/app.full.min.js'
      }
    },
    ngAnnotate: {
      main: {
        src: 'temp/app.full.js',
        dest: 'temp/app.full.js'
      }
    },
    ngtemplates: {
      main: {
        options: {
          module: appName,
          htmlmin: '<%= htmlmin.main.options %>'
        },
        src: [createFolderGlobs('*.html'), '!index.html', '!_SpecRunner.html'],
        dest: 'temp/templates.js'
      }
    },
    // Karma - Unit Test Configuration.
    karma: {
      options: {
        frameworks: ['jasmine'],
        preprocessors: {
          '*.js': ['coverage'],
          'home/**/*.js': ['coverage'],
          '**/*.html': ['ng-html2js']
        },
        files: [  //this files data is also updated in the watch handler, if updated change there too
          '<%= dom_munger.data.appjs %>',
          'bower_components/angular-mocks/angular-mocks.js',
          'bower_components/angular-material/angular-material-mocks.js',
          'test/mocks/*.js',
          createFolderGlobs(['*-spec.js', '*.html'], {ignoreDir: 'e2e'}),
        ],
        logLevel: 'ERROR',
        reporters: ['mocha', 'coverage', 'html'],
        coverageReporter: {
          type: 'html',
          dir:  'reports/ut/coverage/'
        },
        htmlReporter: {
          outputFile: 'reports/ut/index.html',
          pageTitle: 'Unit Tests'
        },
        autoWatch: false, //watching is handled by grunt-contrib-watch
        singleRun: true
      },
      all_tests: {
        browsers: ['PhantomJS']
      },
      during_watch: {
        browsers: ['PhantomJS']
      }
    },
    // Protractor - E2E Test Configuration.
    protractor: {
      options: {
        keepAlive: false,
        singleRun: false,
        configFile: 'e2e/conf.js'
      },
      run_chrome: {
        options: {
          args: {
            baseUrl: 'http://localhost' + ':' + '<%= connect.options.port %>',
            specs: ['e2e/**/*-spec.js'],
            browser: "chrome"
          }
        },
      },
      run_firefox: {
        options: {
          args: {
            baseUrl: 'http://localhost' + ':' + '<%= connect.options.port %>',
            specs: ['e2e/**/*-spec.js'],
            browser: "firefox"
          }
        }
      },
      run_safari: {
        options: {
          args: {
            baseUrl: 'http://localhost' + ':' + '<%= connect.options.port %>',
            specs: ['e2e/**/*-spec.js'],
            browser: "safari"
          }
        }
      },
      run_ie: {
        options: {
          args: {
            baseUrl: 'http://localhost' + ':' + '<%= connect.options.port %>',
            specs: ['e2e/**/*-spec.js', 'e2e/**/*-po.js'],
            browser: 'internet explorer'
          }
        }
      },
      main: {}

    },
    protractor_webdriver: {
      main: {}
    },
    compress: {
      main: {
        cwd: 'build/stage/',
        options: {
          mode: 'tgz',
          archive: 'build/stage/'+camelToDash(appName)+'.tgz'
        },
        expand: true,
        src: ['launchpad/apps/'+camelToDash(appName)+'/**/*']
      }
    },
    maven: {
      // cwd: 'build/stage/', /* Use cwd when grunt-maven-tasks supports it. */
      'deploy-release': {
        options: {
          goal: 'deploy',
          groupId: 'com.adtran.launchpad.widgets.'+ deployCategory,
          packaging: 'tgz',
          url: 'http://package.adtran.com:8081/nexus/content/repositories/adtran-release/',
          injectDestFolder: false,
          artifactId: camelToDash(appName),
          repositoryId: 'adtran-repo',
          version: version,
          settingsXml: './settings.xml'
        },
        src: ['launchpad/apps/'+camelToDash(appName)+'/**/*']
      }
    },
    shell: {
      options: {
        registry: 'cn-docker.adtran.com:5000',
        imageName: camelToDash(appName)
      },
      'docker-build': {
        command: 'docker build -t ' + '<%= shell.options.registry %>' + '/' +
        '<%=shell.options.imageName %>' + ' .'
      },
      'docker-push': {
        command: 'docker push ' + '<%= shell.options.registry %>' + '/' + '<%=shell.options.imageName %>'
      },
      'update_webdriver': {
        command: './node_modules/protractor/bin/webdriver-manager update --standalone'
      },
      'git-version-tag': {
        command: [
          'echo \"AT_VERSION=v' + version + '\" > jenkins.properties'
          //  'echo \"{ version=' + version + ' }\" > dist/version.json'
        ].join('&&')
      },
      'add-prod-code': {
        command: 'cat production_only_code.js >> temp/app.full.js'
      }
    }
  });

  grunt.registerTask('serve-proxy', function (protocol, ip, port) {
    protocol = protocol || "http";
    ip = ip || "localhost";
    if(protocol==="https"){
      port = port || 443;
      //grunt.config.set('connect.options.protocol', "https");
    }else{
      port = port || 80;
    }
    protocol = protocol+":";
    grunt.log.writeln("Setting proxy to "+protocol+"//"+ip+":"+port);
    var proxyInfo = [{
      context: '/apps',
      host: ip,
      port: port,
      protocol: protocol
    }, {
      context: '/api',
      host: ip,
      port: port,
      protocol: protocol
    }];
    grunt.config.set('connect.proxies', proxyInfo);
    grunt.task.run('serve');
  });


  grunt.registerTask('fileshare-upload-tgz', function() {
    var exec = require('child_process').execSync;
    var cmd = 'curl -F file=@build/stage/'+camelToDash(appName)+'.tgz http://fileshare.test.adtran.com/api/files';
    var uploadResult = exec(cmd);
    if(uploadResult.indexOf('{')!==0){
      grunt.log.writeln("Upload failed! :(");
      return false;
    }else{
      var obj = JSON.parse(uploadResult);
      var uploadUri = obj.uri;
      grunt.log.writeln("");
      grunt.log.writeln("URI:");
      grunt.log.writeln(uploadUri);
      grunt.log.writeln("");
      grunt.log.writeln("SHELL COMMAND TO ADD TO A CORE:");
      grunt.log.writeln("cd /opt/adtran/ && rm "+camelToDash(appName)+".tgz || true && wget "+uploadUri+" && tar -xvzf "+camelToDash(appName)+".tgz && /opt/adtran/firefly-init/bin/firefly_init stop uiservice && /opt/adtran/firefly-init/bin/firefly_init start uiservice");
      return true;
    }
  });

  grunt.registerTask('getRestCalls', function() {
    //Constants
    var searchString = "/restconf/";
    var catfile = "temp/app.full.js";

    //Do a grep on the full code file specified above
    var exec = require('child_process').execSync;
    var cmd = 'grep '+searchString+' '+catfile + " || true";
    var grepResult = exec(cmd);

    grepResult = grepResult.toString().replace("\n", " ");

    //Match results to a regex to extract just YANG name
    var rx = new RegExp("\/restconf\/[^\/]*\/([^\/']*)", "g");
    var match = rx.exec(grepResult);

    //Continue to get matches from the regex until there are no more
    var allMatches = [];
    while(match !== null){
      //Confirm there's not already the same string in the result array
      if(allMatches.indexOf(match[1]) === -1){
        grunt.log.writeln(match[1]);
        allMatches.push(match[1]);
      }
      match = rx.exec(grepResult);
    }

    manifest.app.uris = allMatches;

  });

  grunt.registerTask('setBuildTypeDev', function() {
    grunt.log.writeln("Starting development build without minification.");
    buildType = "development";
  });

  grunt.registerTask('setBuildTypeProd', function() {
    grunt.log.writeln("Starting production build without debug data or debug logging.");
    buildType = "production";
  });

  grunt.registerTask('writeManifest', function() {
    var manifestOutputFilename = "dist/manifest.json";
    var jsonSpacing = 2;

    var currentTime = new Date();
    var currentTimeString = currentTime.toString();
    var timeInMs = Date.now();

    if(!buildNumber){
      buildNumber = "dev" + timeInMs;
    }

    manifest.app.version = version;
    manifest.app.build = {
      timestamp: currentTimeString,
      type: buildType,
      identifier: buildNumber
    };

    var bower = require('./bower.json');
    var usesAPI = false;
    var usesAngular = false;
    if(bower.dependencies['launchpad-api']){
      usesAPI = true;
    }
    if(bower.dependencies['angular']){
      usesAngular = true;
    }
    manifest.app.uses = {
      'platform-api': usesAPI,
      'angular': usesAngular
    };

    var outputFileContents = JSON.stringify(manifest, function(key, value){ return value; }, jsonSpacing);

    var fs = require('fs');
    fs.writeFileSync(manifestOutputFilename, outputFileContents);

    grunt.log.writeln(manifestOutputFilename + " written.");
    grunt.log.writeln("");
    grunt.log.writeln("App version: " + version);
  });


  grunt.registerTask('about', function() {
    grunt.log.writeln("");
    grunt.log.writeln("Version: "+gruntfileVersion);
    grunt.log.writeln(aboutGruntfile);
    grunt.log.writeln("\n---Avalible Public Commands---");

    var i;
    for(i = 0; i<avaliblePublicCommands.length; i++){
      grunt.log.writeln(avaliblePublicCommands[i]);
    }

    return true;
  });


  //e2e
  grunt.registerTask('e2e', function (from, protocol, ip, port, browserName) {
    grunt.config.set('protractor.options.configFile', 'e2e/conf.js');

    var my_protocol = (protocol !== undefined && protocol.length > 0) ? protocol : 'http';
    my_protocol += '://';

    var fromSrc = (from === undefined || from.length <=0 || from === "src" || from === "main");
    var fromDist = (from === "dist");

    if(fromDist) {
      grunt.config.set('connect.dist.options.open', false);
      grunt.task.run('connect:dist');
      console.log('Serving project from /dist');
      console.log('NOTE: Ensure that the project has been built to /dist first.');
    } else if(fromSrc){
      grunt.config.set('connect.main.options.open', false);
      grunt.task.run('connect:main');
      console.log('Serving project from the project source');
    }else{
      console.log('Not serving project.');
    }

    if(ip === undefined || ip.length <= 0){
      ip = "localhost";
      port = grunt.config('connect.options.port');
      console.log('Automation testing ' + my_protocol + ip + ':' + port);
    } else {
      if (port !== undefined && port.length > 0) {
        console.log('Automation testing ' + my_protocol + ip + ':' + port);
        grunt.config.set('protractor.run_chrome.options.args.baseUrl', my_protocol + ip + ':' + port);
        grunt.config.set('protractor.run_firefox.options.args.baseUrl', my_protocol + ip + ':' + port);
      } else {
        console.log('Automation testing ' + my_protocol + ip);
        grunt.config.set('protractor.run_chrome.options.args.baseUrl', my_protocol + ip);
        grunt.config.set('protractor.run_firefox.options.args.baseUrl', my_protocol + ip);
      }
    }

    grunt.task.run('shell:update_webdriver');

    if(fromDist){
      grunt.task.run('configureProxies:dist');
    }else if(fromSrc){
      grunt.task.run('configureProxies:main');
    }

    grunt.task.run('protractor_webdriver');

    var isWin = /^win/.test(process.platform);
    console.log('OS is ' + process.platform);

    if (isWin) {
      console.log("Running Windows automation");
      grunt.task.run('protractor:run_firefox');
    } else {
      if (browserName === undefined || browserName.indexOf("chrome") === 0) {
        console.log("Running automation on Chrome");
        grunt.task.run('protractor:run_chrome');
      } else if(browserName.indexOf("all") === 0){
        console.log("(1/2) Running automation on Chrome");
        grunt.task.run('protractor:run_chrome');
        console.log("(2/2) Running automation on Firefox");
        grunt.task.run('protractor:run_firefox');
      } else {
        console.log("Running automation on Firefox");
        grunt.task.run('protractor:run_firefox');
      }
    }

  });

  grunt.registerTask('e2eoriginal', ['connect:dist', 'shell:update_webdriver', 'configureProxies:dist', 'protractor_webdriver', 'protractor']);
  grunt.registerTask('e2edist', ['connect:dist', 'shell:update_webdriver', 'protractor_webdriver', 'configureProxies', 'protractor:run_chrome']);
  grunt.registerTask('e2eip', ['shell:update_webdriver', 'protractor_webdriver', 'protractor:run_firefox', 'protractor:run_chrome']);
  grunt.registerTask('e2eipchrome', ['shell:update_webdriver', 'protractor_webdriver', 'protractor:run_chrome']);
  grunt.registerTask('e2eipfirefox', ['shell:update_webdriver', 'protractor_webdriver', 'protractor:run_firefox']);
  grunt.registerTask('e2ewin', ['shell:update_webdriverwin', 'protractor_webdriver', 'protractor:run_firefox']);

  grunt.registerTask('copy-library-fonts', ['clean:fonts', 'copy:libraryFonts']);

  // Docker Tasks
  grunt.registerTask('docker-build', ['shell:docker-build']);
  grunt.registerTask('docker-push', ['shell:docker-push']);
  grunt.registerTask('git-version-tag', ['shell:git-version-tag']);

  //BUILDS
  grunt.registerTask('build', function (type){
    if(type === undefined || type==="normal" || typeof(type)!=="string"){
      grunt.task.run('build-normal');
    }else if(type.indexOf("prod") === 0){
      grunt.task.run('build-prod');
    }else if(type.indexOf("dev") === 0 || type.indexOf("debug") === 0){
      grunt.task.run('build-dev');
    }else{
      console.log("Unknown build type. Types are: build, build:prod, build:dev");
      return false;
    }
  });

  grunt.registerTask('build-normal', ['jshint', 'clean:before', 'clean:stage', 'less', 'dom_munger:read','karma:all_tests','dom_munger:update', 'ngtemplates', 'copy-library-fonts', 'cssmin', 'concat', 'getRestCalls', 'ngAnnotate', 'uglify', 'copy:main', 'htmlmin', 'clean:after', 'git-version-tag', 'writeManifest']);

  grunt.registerTask('build-prod', ['setBuildTypeProd', 'jshint', 'clean:before', 'clean:stage', 'less', 'dom_munger:read','karma:all_tests','dom_munger:update', 'ngtemplates', 'copy-library-fonts', 'cssmin', 'concat', 'getRestCalls', 'ngAnnotate', 'shell:add-prod-code', 'uglify', 'copy:main', 'htmlmin', 'clean:after', 'git-version-tag', 'writeManifest']);

  grunt.registerTask('build-dev', ['setBuildTypeDev', 'jshint', 'clean:before', 'clean:stage', 'less', 'dom_munger:read','karma:all_tests','dom_munger:updateNoMin', 'ngtemplates', 'copy-library-fonts', 'concat', 'getRestCalls', 'ngAnnotate', 'copy:nomin', 'copy:main', 'htmlmin', 'clean:after', 'git-version-tag', 'writeManifest']);

  //Serves
  grunt.registerTask('serve', function (type){
    if(type !== undefined && type==="dist"){
      console.log("Serving from /dist folder.");
      grunt.task.run('serve-dist');
    }else{
      grunt.task.run('serve-normal');
    }
  });
  grunt.registerTask('serve-normal', ['copy:serve','dom_munger:read', 'jshint', 'connect:main', 'configureProxies:main', 'watch']);
  grunt.registerTask('serve-dist',   ['dom_munger:read', 'jshint', 'connect:dist', 'configureProxies:dist', 'watch']);

  grunt.registerTask('test', ['dom_munger:read', 'karma:all_tests']);
  grunt.registerTask('tgz', [ 'copy:stage', 'compress']);
  grunt.registerTask('fileshare', [ 'tgz', 'fileshare-upload-tgz']);
  grunt.registerTask('printDeployCategory', function() {
    console.log('Deploy Category: ' + deployCategory);
    console.log('groupId: ' + grunt.config.get('maven.deploy-release.options.groupId') );
    console.log('artifactId: ' + grunt.config.get('maven.deploy-release.options.artifactId') );
  });
  grunt.registerTask('deploy', ['printDeployCategory', 'copy:deploy', 'maven:deploy-release', 'clean:deploy']);
  grunt.registerTask('default', ['build']);

  grunt.event.on('watch', function (action, filepath) {
    //https://github.com/gruntjs/grunt-contrib-watch/issues/156

    var tasksToRun = [];

    if (filepath.lastIndexOf('.js') !== -1 && filepath.lastIndexOf('.js') === filepath.length - 3) {

      //lint the changed js file
      grunt.config('jshint.main.src', filepath);
      tasksToRun.push('jshint');

      //find the appropriate unit test and html file for the changed file
      var spec, html;
      if (filepath.lastIndexOf('-spec.js') === -1 || filepath.lastIndexOf('-spec.js') !== filepath.length - 8) {
        spec = filepath.substring(0, filepath.length - 3) + '-spec.js';
        html = filepath.substring(0, filepath.length - 3) + '.html';
      } else {
        spec = filepath;
        html = filepath.substring(0, filepath.length - 8) + '.html';
      }

      //if the spec exists then lets run it
      if (grunt.file.exists(spec)) {
        var files = [].concat(grunt.config('dom_munger.data.appjs'));
        files.push('bower_components/angular-mocks/angular-mocks.js');
        files.push(spec);

        //if the html exists then push to files
        if (grunt.file.exists(html)) {
          files.push(html);
        }
        grunt.config('karma.options.files', files);
        tasksToRun.push('karma:during_watch');
      }
    }

    //if index.html changed, we need to reread the <script> tags so our next run of karma
    //will have the correct environment
    if (filepath === 'index.html') {
      tasksToRun.push('dom_munger:read');
    }

    grunt.config('watch.main.tasks', tasksToRun);

  });
};