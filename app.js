var express = require("express"),
    app = express(),
	http = require('http')
	path = require('path')
	request = require('request'),
    swig  = require('swig'),
    path = require('path'),
    favicon = require('serve-favicon'),
    bodyParser = require('body-parser'),
    errorHandler = require('errorhandler'),
    methodOverride = require('method-override'),
    hostname = process.env.HOSTNAME || 'localhost',
    port = parseInt(process.env.PORT, 10) || 4567;

var prodEnv = false;
app.set('port', process.env.PORT || 4567);
app.engine('html', swig.renderFile);
//app.set('views', __dirname + '/app');
console.log('views : ', app.get('views') );
app.set('views', __dirname);
app.set('view engine', 'html');
// Swig will cache templates for you, but you can disable
// that and use Express's caching instead, if you like:
app.set('view cache', false);
// To disable Swig's cache, do the following:
swig.setDefaults({ cache: false });

app.get("/", function (req, res) {
	console.log('get ');
  res.redirect("/index.html");
});

app.get("/index.html", function (req, res) {
  //res.redirect("/index-build.html");
  console.log('get ');
  res.render(prodEnv ? 'index' : 'index' );
});

app.use(favicon(__dirname + '/favicon.ico'));
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
console.log('PATH ', path.join(__dirname, prodEnv ? '.' : '.') );
app.use('/static', express.static(__dirname ));
//app.use(express.static(path.join(__dirname, prodEnv ? 'app' : 'app')));
app.use(errorHandler({
  dumpExceptions: true,
  showStack: true
}));

console.log("Simple static server showing listening at http://%s:%s", hostname, port);
//app.listen(port, hostname);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
