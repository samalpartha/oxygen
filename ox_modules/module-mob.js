"use strict";
/**
 * Provides methods for mobile automation. 
 */
const STATUS = require('../model/status.js');

module.exports = function (options, context, rs, logger) {
	// this needs to be defined for wdio to work in sync mode 
	global.browser = {
		options: {
			sync: true
		}
	};
	var module = this._module = { modType: "fiber" };
	var helpers = this._helpers = {};
	
	var moment = require('moment');
	var wdioSync = require('wdio-sync');
	var wdio = require('webdriverio');
	var path = require('path');
	var fs = require('fs');
    const errorsHelper = this.errorsHelper = require('../errors/helper');
	var StepResult = require('../model/stepresult');
	var Failure = require('../model/stepfailure');
    
    var OxError = this._OxError = require('../errors/OxygenError');
    var errHelper = this._errHelper = require('../errors/helper');
	
	// constants
	const DEFAULT_WAIT_TIMEOUT = this.DEFAULT_WAIT_TIMEOUT = 60000; 
	const POOLING_INTERVAL = this.POOLING_INTERVAL = 5000; 
	const DEFAULT_APPIUM_PORT = this.DEFAULT_APPIUM_PORT = 4723;
	const DEFAULT_APPIUM_HOST = this.DEFAULT_APPIUM_HOST = "127.0.0.1";

    this._client = null; //wdSync.remote("localhost", 4723);
    this._driver = null; //module.driver = client.browser;
	
	var _this = this;               // reference to this instance
	this._isInitialized = false;    // initialization indicator
	this._rs = rs;                  // results store
	this._ctx = context;            // context variables
	this._options = options;        // startup options
	this.logger = logger;           // set logger
	this.sessionId = null;          // store current session id
	this._caps = null;              // save driver capabilities for later use when error occures
	this._host = options.host || DEFAULT_APPIUM_HOST;   // appium or selenium hub host name
	this._port = options.port || DEFAULT_APPIUM_PORT;   // appium or selenium hub port number
	this._context = "NATIVE_APP";

	const NO_SCREENSHOT_COMMANDS = [
		"init"
	];
	const ACTION_COMMANDS = [
		"open",
		"tap",
		"click",
		"swipe",
		"submit",
		"setValue"
	];
    
    // TODO: _assert* should be extracted into a separate helper later on
    this._assertLocator = function(locator) {
        if (!locator) {
            throw new this._OxError(this._errHelper.errorCode.SCRIPT_ERROR, 'Invalid argument - locator not specified');
        }
    };
    this._assertArgument = function(arg) {
        if (arg === undefined) {
            throw new this._OxError(this._errHelper.errorCode.SCRIPT_ERROR, 'Invalid argument - argument is required.');
        }
    };
    this._assertArgumentNonEmptyString = function(arg) {
        if (!arg || typeof arg !== 'string') {
            throw new this._OxError(this._errHelper.errorCode.SCRIPT_ERROR, 'Invalid argument - should be a non-empty string.');
        }
    };
    this._assertArgumentNumber = function(arg) {
        if (typeof(arg) !== 'number') {
            throw new this._OxError(this._errHelper.errorCode.SCRIPT_ERROR, 'Invalid argument - should be a number.');
        }
    };
	
    // load external commands
    // FIXME: this needs to live in module loader so module creator won't need to implement it in each module
	(function() {
        var cmdDir = path.join(__dirname, 'module-mob', 'commands');
        if (fs.existsSync(cmdDir)) {
            var commandName = null;
            try {
                var files = fs.readdirSync(cmdDir);
                for (var fileName of files) {
                    commandName = fileName.slice(0, -3);
                    if (commandName.indexOf('.') !== 0) {   // ignore possible hidden files (i.e. starting with '.')
                        module[commandName] = require(path.join(cmdDir, commandName));
                    }
                }	
            }
            catch (e) {
                console.log("Can't load command '" + commandName + ": " + e.message);
                console.log(e.stack);
            }
        }
	})();
	
    // FIXME: needs to be rafactored so the wrapper can be used for other modules
	function wrapModuleMethods() {
		for (var key in module) {
			if (typeof module[key] === 'function' && key.indexOf('_') != 0) {
				module[key] = commandWrapper(key, module[key]);
			}
		}
	}
	
	function commandWrapper(cmdName, cmdFunc) {
		return function() {
			var args = Array.prototype.slice.call(arguments);
			var startTime = moment.utc();
			var endTime = null;
			try {
				var retval = cmdFunc.apply(_this, args);
				endTime = moment.utc();
				addStep(cmdName, args, endTime - startTime, retval, null);
				return retval;
			}
			catch (e) {
				endTime = moment.utc();
				e = errorsHelper.getOxygenError(e, cmdName, args, _this._options, _this._caps);
				addStep(cmdName, args, endTime - startTime, null, e);
				throw e;
			}
		};
	}
	
	// public properties
	module.autoPause = false;   // auto pause in waitFor
	module.autoWait = false;    // auto wait for actions
	// automatically renew appium session when init() is called for existing session
	module.autoReopen = options.autoReopen || true;
	module.driver = null;

	/**
     * @function init
	 * @summary Initializes a new Appium session.
     * @description Initializes a new Appium session with provided desired capabilities and optional host name and port.
     * @param {String} caps - New session's desired capabilities.
	 * @param {String=} host - Appium server host name (default: localhost).
	 * @param {Number=} port - Appium server port (default: 4723).
     */
	module.init = function(caps, host, port) {
		// ignore init if the module has been already initialized
		// this is required when test suite with multiple test cases is executed
		// then .init() might be called in each test case, but actually they all need to use the same Appium session
		if (_this._isInitialized) {
			if (module.autoReopen) {
				_this._driver.reload();
			}
			else {
				logger.debug('init() was called for already initialized module. autoReopen=false so the call is ignored.');
			}
			return;
		}
		var wdioOpts = {
			host: host || _this._options.host || DEFAULT_APPIUM_HOST,
			port: port || _this._options.port || DEFAULT_APPIUM_PORT,
			desiredCapabilities: caps
		}
		// initialize driver with either default or custom appium/selenium grid address
		_this._driver = module.driver = wdio.remote(wdioOpts);
		wdioSync.wrapCommands(_this._driver);
		_this._caps = caps || _this._ctx.caps;
		_this._driver.init();	
		_this._isInitialized = true;
	};
	
	/**
     * @summary Opens new transaction.
     * @description The transaction will persist till a new one is opened. Transaction names must be
     *              unique.
     * @function transaction
     * @param {String} name - The transaction name.
     */
    module.transaction = function (name) { 
        _this._ctx._lastTransactionName = name;
    };
	/**
	 * @function setContext
     * @summary Sets a specific context (NATIVE_APP, WEBVIEW, etc.).
     * @param {String} context - The context name.
	 * @for android, ios
     */
	module.setContext = function(context) {
		_this._driver.context(context);
		this._context = context;
	};
	/**
	 * @function getSource
     * @summary Gets the source code of the page.
	 * @for android, ios
     */
	module.getSource = function() {
		return _this._driver.source();
	}
	/**
	 * @function execute
     * @summary Executes a JavaScript code inside the HTML page.
	 * @for android, ios
     */
	module.execute = function(js, elm) {
		return _this._driver.execute(js, elm);
	}
	/**
	 * @function dispose
     * @summary Ends the current session.
	 * @for android, ios
     */
	module.dispose = function() {
		if (_this._driver && _this._isInitialized) {
			var retval = _this._driver.end();
			_this._isInitialized = false;
		}
	}	
	/**
	 * @function takeScreenshot
     * @summary Take a screenshot of the current page or screen.
	 * @for android, ios
     */
	module.takeScreenshot = function () {
		var response = _this._driver.screenshot();
		return response.value || null;
	};
	/**
	 * @function sendKeys
     * @summary Sends a sequence of key strokes to the element.
	 * @param {String} locator - Locator of the element to be found. "id=" to search by ID or "//" to search by XPath.
	 * @param {String} value - A value to be set to the element.
	 * @for android, ios
     */ 	
	module.sendKeys = function(locator, value) { 
		return module.setValue(locator, value);
	};		
	
	function addStep(name, args, duration, retval, err) {
        var step = new StepResult();
		var result = {
			step: step,
			err: null,
			value: retval
		}
		
		step._name = "mob." + name;
		step._transaction = _this._ctx._lastTransactionName;
		step._status = err ? STATUS.FAILED : STATUS.PASSED;
		step._action = ACTION_COMMANDS.includes(name).toString();
		step._duration = duration;
		
		if (err) {
			step.failure = new Failure();
			step.failure._message = err.message;
			step.failure._type = err.type;
			// take a screenshot
			if (!NO_SCREENSHOT_COMMANDS.includes(name))	// FIXME: extract cmd part from result.step._name
				step.screenshot = module.takeScreenshot();
		}
		// add step to result store
		_this._rs.steps.push(step);
	}

	helpers.getWdioLocator = function(locator) {
		if (locator.indexOf('/') == 0)
			return locator;	// leave xpath locator as is
		// convert locators to UIAutomator selectors if we are in NATIVE_APP context and on Anroid
		if (_this._context === 'NATIVE_APP' && _this._caps.platformName && _this._caps.platformName.toLowerCase() === 'android') {
			if (locator.indexOf('id=') == 0)
				return 'android=new UiSelector().resourceId("' + locator.substr('id='.length) + '")';
			else if (locator.indexOf('css=') == 0)
				return 'android=new UiSelector().className("' + locator.substr('css='.length) + '")';
			else if (locator.indexOf('class=') == 0)
				return 'android=new UiSelector().className("' + locator.substr('class='.length) + '")';
			else if (locator.indexOf('text=') == 0)
				return 'android=new UiSelector().text("' + locator.substr('text='.length) + '")';
			else if (locator.indexOf('desc=') == 0)
				return 'android=new UiSelector().description("' + locator.substr('desc='.length) + '")';
		}
		// for anything other than Android and NATIVE_APP context
		else {
			if (locator.indexOf('id=') == 0)
				return '#' + locator.substr('id='.length);	// convert 'id=' to '#'
			if (locator.indexOf('name=') == 0)
				return '[name=' + locator.substr('name='.length) + ']';	
		}
		// if locator has not been recognized, return it as is
		return locator;
	}
	
	// wrap module methods
	wrapModuleMethods();
	
    return module;
};