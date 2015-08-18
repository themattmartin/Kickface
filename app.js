var express = require('express')
  , http = require('http')
  , path = require('path')
  , request = require('request')
  , api = require('./services/api')
  , swig  = require('swig');

var app = express();

// This is where all the magic happens!
app.engine('html', swig.renderFile);

// all environments
app.set('port', process.env.PORT || 3005);
//app.set('views', __dirname + '/build');
app.set('view engine', 'html');

// Swig will cache templates for you, but you can disable
// that and use Express's caching instead, if you like:
app.set('view cache', false);
// To disable Swig's cache, do the following:
swig.setDefaults({ cache: false });
// NOTE: You should always cache templates in a production environment.
// Don't leave both of these to `false` in production!

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
//app.use(require('less-middleware')({ src: __dirname + '/public' }));

// Publish `compiled` Folder as Static Directory
app.use(express.static(path.join(__dirname, 'build')));

app.use(express.errorHandler());

app.use(redirectUnmatched);
app.post('/auth', api.auth);
var prodEnv = true;
app.get('/index.html', function (req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.render(prodEnv ? 'index-bin' : 'index-build');
	//res.render(prodEnv ? 'index-bin' : 'index-build');
});

app.get('/', function (req, res) {
	res.render('index-build');
});

function redirectUnmatched(req, res) {
  res.redirect("index.html#/dashboard/home/");
}

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
