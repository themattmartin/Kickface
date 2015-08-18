  /**
 * This file/module contains all configuration for the build process.
 */
module.exports = {
  /**
   * The `build_dir` folder is where our projects are compiled during
   * development and the `compile_dir` folder is where our app resides once it's
   * completely built.
   */
  build_dir: 'build',
  compile_dir: 'bin',

  /**
   * This is a collection of file patterns that refer to our app code (the
   * stuff in `src/`). These file paths are used in the configuration of
   * build tasks. `js` is all project javascript, less tests. `ctpl` contains
   * our reusable components' (`src/common`) template HTML files, while
   * `atpl` contains the same, but for our app's code. `html` is just our
   * main HTML file, `less` is our main stylesheet, and `unit` contains our
   * app's unit tests.
   */
  app_files: {
    js: [ 'src/**/*.js', '!src/**/*.spec.js', '!src/assets/**/*.js' ],
    jsunit: [ 'src/**/*.spec.js' ],
    
    coffee: [ 'src/**/*.coffee', '!src/**/*.spec.coffee' ],
    coffeeunit: [ 'src/**/*.spec.coffee' ],

    atpl: [ 'src/app/**/*.tpl.html' ],
    ctpl: [ 'src/common/**/*.tpl.html' ],

    html: [ 'src/index.html' ],
    less: 'src/less/main.less'

  },

  /**
   * This is a collection of files used during testing only.
   */
  test_files: {
    js: [
      'app/bower_components/angular-mocks/angular-mocks.js'
    ]
  },

  /**
   * This is the same as `app_files`, except it contains patterns that
   * reference vendor code (`vendor/`) that we need to place into the build
   * process somewhere. While the `app_files` property ensures all
   * standardized files are collected for compilation, it is the user's job
   * to ensure non-standardized (i.e. vendor-related) files are handled
   * appropriately in `vendor_files.js`.
   *
   * The `vendor_files.js` property holds files to be automatically
   * concatenated and minified with our project source files.
   *
   * The `vendor_files.css` property holds any CSS files to be automatically
   * included in our app.
   *
   * The `vendor_files.assets` property holds any assets to be copied along
   * with our app's assets. This structure is flattened, so it is not
   * recommended that you use wildcards.
   */
  vendor_files: {
    js: [
      'app/bower_components/firebase/firebase.js',
      'app/bower_components/firebase-simple-login/firebase-simple-login.js',
      'app/bower_components/jquery/dist/jquery.js',
      
      'app/bower_components/jquery-ui/ui/jquery-ui.js',
      'app/bower_components/angular/angular.js',
      'app/bower_components/ng-grid/build/ng-grid.js',
      'app/bower_components/angularfire/dist/angularfire.js',
      'app/bower_components/angular-route/angular-route.js',
      'app/bower_components/angular-sanitize/angular-sanitize.js',
      'app/bower_components/angular-animate/angular-animate.js',
      'app/bower_components/bootstrap/js/collapse.js',
      'app/bower_components/bootstrap/js/tooltip.js',
      'app/bower_components/bootstrap/js/popover.js',

      'app/js/app.js',
      'app/js/config.js',
      'app/js/controllers.js',
      'app/js/decorators.js',
      'app/js/directives.js',
      'app/js/filters.js',
      'app/js/routes.js',
      'app/js/services.js',
      'app/js/firebase.utils.js',
      'app/js/simpleLogin.js',
      'app/js/changeEmail.js',
      //'app/bower_components/bootstrap/js/dropdown.js', // Commented to fix dropdown double click issue
      'app/bower_components/angular-strap/dist/angular-strap.js',
      'app/bower_components/angular-strap/dist/angular-strap.tpl.js',
      'app/bower_components/angular-bootstrap/ui-bootstrap.js',
      'app/bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
      'app/bower_components/angular-route/angular-route.js',
      'app/bower_components/angular-ui-router/release/angular-ui-router.js',
      'app/bower_components/angular-cookies/angular-cookies.js',
      'app/bower_components/angular-webstorage/angular-webstorage.js',
      'app/bower_components/highcharts-ng/src/highcharts-ng.js',
      'app/bower_components/underscore/underscore.js',
      'app/bower_components/lodash/dist/lodash.js',
      'app/bower_components/bluebird/js/browser/bluebird.js',
      'app/bower_components/angular-google-maps/dist/angular-google-maps.js',
      'libraries/gauge.min.js',
      'libraries/bootstrap-slider.js',
      'app/bower_components/metisMenu/jquery.metisMenu.js', 
      'app/bower_components/angular-local-storage/angular-local-storage.js',
      'app/bower_components/elasticsearch/elasticsearch.angular.js',
      'app/bower_components/angular-ui-tree/dist/angular-ui-tree.js',
      'app/bower_components/attache.plural/attache.plural.js',
      'app/bower_components/angular-ui-calendar/src/calendar.js',
      'app/bower_components/fullcalendar/fullcalendar.js',
      'app/bower_components/codemirror/lib/codemirror.js',
      'app/bower_components/angular-ui-codemirror/ui-codemirror.js',
      'app/bower_components/ng-csv/build/ng-csv.js',
      'app/bower_components/angular-json-viewer/json-viewer.js',
      'app/bower_components/angular-filter/dist/angular-filter.js',
      'app/bower_components/moment/moment.js',
      'app/bower_components/angular-dragdrop/src/angular-dragdrop.js',
      'app/bower_components/ng-resize/ngresize.js'
      // 'libraries/angular-dashboard-framework/adf.js',
      // 'libraries/angular-dashboard-framework/provider.js',
      // 'libraries/angular-dashboard-framework/sortable.js',
      // 'libraries/angular-dashboard-framework/widget-content.js',
      // 'libraries/angular-dashboard-framework/widget.js',
      // 'libraries/angular-dashboard-framework/dashboard.js'
   ],
   css: [
      // 'libraries/angular-dashboard-framework/angular-dashboard-framework.min.css'
      //'vendor/fullcalendar/fullcalendar.css',
      'app/bower_components/jquery-ui/themes/smoothness/jquery-ui.min.css',
      'app/bower_components/angular-resizable/src/angular-resizable.css'
   ],
   assets: [
   
      'app/bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.eot',
      'app/bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.svg',
      'app/bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.ttf',
      'app/bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.woff',
      'app/bower_components/components-font-awesome/fonts/fontawesome-webfont.eot',
      'app/bower_components/components-font-awesome/fonts/fontawesome-webfont.svg',
      'app/bower_components/components-font-awesome/fonts/fontawesome-webfont.ttf',
      'app/bower_components/components-font-awesome/fonts/fontawesome-webfont.woff',
      'app/bower_components/components-font-awesome/fonts/FontAwesome.otf'
    ]
  },
};
