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
      'vendor/angular-mocks/angular-mocks.js'
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
      'vendor/firebase/firebase.js',
      'vendor/firebase-simple-login/firebase-simple-login.js',
      'vendor/jquery/dist/jquery.js',
      /*
      'vendor/jquery-ui/ui/jquery.ui.core.js',
      'vendor/jquery-ui/ui/jquery.ui.widget.js',
      'vendor/jquery-ui/ui/jquery.ui.mouse.js',
      'vendor/jquery-ui/ui/jquery.ui.sortable.js',  
      'vendor/jquery-ui/ui/jquery.ui.draggable.js',
      'vendor/jquery-ui/ui/jquery.ui.droppable.js',  
      'vendor/jquery-ui/ui/jquery.ui.resizable.js',     
      */
      'vendor/jquery-ui/ui/jquery-ui.js',
      'vendor/angular/angular.js',
      'vendor/ng-grid/build/ng-grid.js',
      'vendor/angularfire/dist/angularfire.js',
      'vendor/angular-route/angular-route.js',
      'vendor/angular-sanitize/angular-sanitize.js',
      'vendor/angular-animate/angular-animate.js',
      'vendor/bootstrap/js/collapse.js',
      'vendor/bootstrap/js/tooltip.js',
      'vendor/bootstrap/js/popover.js',
      //'vendor/bootstrap/js/dropdown.js', // Commented to fix dropdown double click issue
      'vendor/angular-strap/dist/angular-strap.js',
      'vendor/angular-strap/dist/angular-strap.tpl.js',
      'vendor/angular-bootstrap/ui-bootstrap.js',
      'vendor/angular-bootstrap/ui-bootstrap-tpls.js',
      'vendor/angular-ui-router/release/angular-ui-router.js',
      'vendor/angular-cookies/angular-cookies.js',
      'vendor/angular-webstorage/angular-webstorage.js',
      'vendor/highcharts-ng/src/highcharts-ng.js',
      'vendor/underscore/underscore.js',
      'vendor/lodash/dist/lodash.js',
      'vendor/bluebird/js/browser/bluebird.js',
      'vendor/angular-google-maps/dist/angular-google-maps.js',
      'libraries/gauge.min.js',
      'libraries/bootstrap-slider.js',
      'vendor/metisMenu/jquery.metisMenu.js', 
      'vendor/angular-local-storage/angular-local-storage.js',
      'vendor/elasticsearch/elasticsearch.angular.js',
      'vendor/angular-ui-tree/dist/angular-ui-tree.js',
      'vendor/attache.plural/attache.plural.js',
      'vendor/angular-ui-calendar/src/calendar.js',
      'vendor/fullcalendar/fullcalendar.js',
      'vendor/codemirror/lib/codemirror.js',
      'vendor/angular-ui-codemirror/ui-codemirror.js',
      'vendor/ng-csv/build/ng-csv.js',
      'vendor/angular-json-viewer/json-viewer.js',
      'vendor/angular-filter/dist/angular-filter.js',
      'vendor/moment/moment.js',
      'vendor/angular-dragdrop/src/angular-dragdrop.js',
      'vendor/ng-resize/ngresize.js'
      // 'libraries/angular-dashboard-framework/adf.js',
      // 'libraries/angular-dashboard-framework/provider.js',
      // 'libraries/angular-dashboard-framework/sortable.js',
      // 'libraries/angular-dashboard-framework/widget-content.js',
      // 'libraries/angular-dashboard-framework/widget.js',
      // 'libraries/angular-dashboard-framework/dashboard.js'
   ],
   css: [
      // 'libraries/angular-dashboard-framework/angular-dashboard-framework.min.css'
      'vendor/fullcalendar/fullcalendar.css',
      'vendor/jquery-ui/themes/smoothness/jquery-ui.min.css',
      'vendor/angular-resizable/src/angular-resizable.css'
   ],
   assets: [
   
      'vendor/bootstrap/dist/fonts/glyphicons-halflings-regular.eot',
      'vendor/bootstrap/dist/fonts/glyphicons-halflings-regular.svg',
      'vendor/bootstrap/dist/fonts/glyphicons-halflings-regular.ttf',
      'vendor/bootstrap/dist/fonts/glyphicons-halflings-regular.woff',
      'vendor/components-font-awesome/fonts/fontawesome-webfont.eot',
      'vendor/components-font-awesome/fonts/fontawesome-webfont.svg',
      'vendor/components-font-awesome/fonts/fontawesome-webfont.ttf',
      'vendor/components-font-awesome/fonts/fontawesome-webfont.woff',
      'vendor/components-font-awesome/fonts/FontAwesome.otf'
    ]
  },
};
