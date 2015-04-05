var bodyParser = require( 'body-parser' );
var cookies = require( 'cookie-parser' );
var sessionLib = require( 'express-session' );
var multer = require( 'multer' );
var metrics = require( '../metrics' );
var wrapper = {
	attach: applyMiddelware,
	configure: configure,
	useCookies: applyCookieMiddleware,
	useSession: applySessionMiddleware,
	sessionLib: sessionLib
};
var _ = require( 'lodash' );
var config, session, cookieParser;

function applyCookieMiddleware( attach ) {
	if ( !config.noCookies ) {
		attach( '/', cookieParser );
	}
}

function applyMiddelware( attach, hasAuth ) {
	// add a timer to track ALL requests
	attach( '/', requestMetrics );

	if ( !hasAuth ) {
		applyCookieMiddleware( attach );
	}

	// turn on body parser unless turned off by the consumer
	if ( !config.noBody ) {
		attach( '/', bodyParser.urlencoded( { extended: false } ) );
		attach( '/', bodyParser.json() );
		attach( '/', bodyParser.json( { type: 'application/vnd.api+json' } ) );
		attach( '/', multer( {
			dest: config.tmp
		} ) );
	}

	if ( !hasAuth ) {
		applySessionMiddleware( attach );
	}

	// turn on cross origin unless turned off by the consumer
	if ( !config.noCrossOrigin ) {
		attach( '/', crossOrigin );
	}
}

function applySessionMiddleware( attach ) {
	// turn on sessions unless turned off by the consumer
	if ( !config.noSession ) {
		attach( '/', session );
	}
}

function crossOrigin( req, res, next ) {
	res.header( 'Access-Control-Allow-Origin', '*' );
	res.header( 'Access-Control-Allow-Headers', 'X-Requested-With' );
	next();
}

function configure( cfg ) {
	config = cfg;
	cfg.sessionStore = cfg.sessionStore || new sessionLib.MemoryStore();
	session = sessionLib( {
		name: config.sessionId || 'ah.sid',
		secret: config.sessionSecret || 'authostthing',
		saveUninitialized: true,
		resave: true,
		store: cfg.sessionStore
	} );
}

function requestMetrics( req, res, next ) {
	req.context = {};
	res.setMaxListeners( 0 );
	var segments = _.filter( req.url.split( '/' ) );
	var timerKey = [ 'http', req.method.toLowerCase() ].concat( segments, 'duration' );
	var timer = metrics.timer( timerKey );
	res.once( 'finish', function() {
		timer.record();
	} );
	next();
}

module.exports = function() {
	cookieParser = cookies();
	return wrapper;
};
