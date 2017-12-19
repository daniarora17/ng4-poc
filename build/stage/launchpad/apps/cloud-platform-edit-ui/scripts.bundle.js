
/*
/*

 ADTRAN Launchpad API - Plain JavaScript App API

 Updated: 7/10/2017

 */

/* global launchpadAPI:true, console:true, parent:true, Promise: true, angular:true */
var launchpadAPI = (function () {
  var parentWindow = parent;

  // bower.json and package.json are updated to match the following version data during build
  // you can then check them into source repo
  var apiVersion = {
    major: 0,   // build major -- do not remove comment
    minor: 20,  // build minor -- do not remove comment
    fix: 3      // build fix -- do not remove comment
  };
  apiVersion.string = apiVersion.major + '.' + apiVersion.minor + '.' + apiVersion.fix;

  var launchpadAuthCode = 35814;  // reserved for Launchpad use only -- no widgets

  var pr;

  // The LaunchpadBindingMap class encapsulates Launchpad binding data at a specific point in time. It is a read-only
  // object and should not be modified.
  function LaunchpadBindingMap( data ) {
    console.log(data, 'ndbcbvcbvvvdjv>>>');
    // The map of bindings.
    this.data = null;
    // The total number of binding callbacks.
    this.bindCount = 0;
    // The number of binding names.
    this.nameCount = 0;

    this.setData( data );
  }

  LaunchpadBindingMap.prototype.getNames = function() {
    var names = [];
    if ( this.data != null )
    {
      var data = this.data;
      for ( var name in data )
      {
        if ( data.hasOwnProperty( name ) )
        {
          names.push( name );
        }
      }
    }
    return names;
  };

  LaunchpadBindingMap.prototype.isLaunchpadBindingMap = true;

  LaunchpadBindingMap.prototype.setData = function( data ) {
    if ( data == null )
    {
      data = {};
    }
    else if ( typeof( data ) !== 'object' )
    {
      throw new TypeError( 'data must be a map of bindings' );
    }
    this.data = data;
    this.bindCount = 0;
    this.nameCount = 0;
    for ( var name in data )
    {
      if ( data.hasOwnProperty( name ) )
      {
        this.nameCount++;
        var callbacks = data[name];
        if ( callbacks != null )
        {
          this.bindCount += callbacks.length;
        }
      }
    }
  };

  // Compare this binding list to another list.
  //
  // param bindings {Object} Another LaunchpadBindingList instance.
  // returns {Object} A result object with the following properties:
  //   equal {boolean}  true if the lists are equal.
  //   extra {Object}   A map of binding names to callback functions that are found in this list but not in the
  //                    specified list
  //   missing {Object} A map of binding names to callback functions that are not found in this list but are found in
  //                    the specified list
  LaunchpadBindingMap.prototype.difference = function( bindings ) {

    function getCallbackDeficit( cb1, cb2 ) {
      var result = null;
      if ( cb1 == null )
      {
        cb1 = [];
      }
      if ( cb2 == null )
      {
        cb2 = [];
      }

      var i;
      for ( i=0; i < cb2.length; i++ )
      {
        var cb = cb2[i];
        if ( cb1.indexOf( cb ) === -1 )
        {
          if ( result == null )
          {
            result = [];
          }
          result.push( cb );
        }
      }

      return result;
    }

    var i, name;
    var result = {
      equal: true,
      extra: null,
      missing: null,
    };

    if ( ( this !== bindings ) || ( ( bindings != null ) && ( this.data !== bindings.data ) ) )
    {
      var names = this.getNames();
      if ( bindings != null )
      {
        var bindingsNames = bindings.getNames();
        for ( i=0; i < bindingsNames.length; i++ )
        {
          name = bindingsNames[i];
          if ( names.indexOf( name ) === -1 )
          {
            names.push( name );
          }
        }
        bindingsNames = null;
      }

      for ( i=0; i < names.length; i++ )
      {
        name = names[i];
        var thisCallbacks = null;
        if ( ( this.data != null ) && this.data.hasOwnProperty( name ) )
        {
          thisCallbacks = this.data[name];
        }
        var bindingsCallbacks = null;
        if ( ( bindings != null ) && ( bindings.data != null ) && bindings.data.hasOwnProperty( name ) )
        {
          bindingsCallbacks = bindings.data[name];
        }

        var diff;
        if ( bindingsCallbacks != null )
        {
          // find missing
          diff = getCallbackDeficit( thisCallbacks, bindingsCallbacks );
          if ( diff != null )
          {
            if ( result.missing == null )
            {
              result.missing = {};
            }
            result.missing[name] = diff;
          }
        }

        if ( thisCallbacks != null )
        {
          // find extra
          diff = getCallbackDeficit( bindingsCallbacks, thisCallbacks );
          if ( diff != null )
          {
            if ( result.extra == null )
            {
              result.extra = {};
            }
            result.extra[name] = diff;
          }
        }
      }

      result.equal = ( ( result.extra == null ) && ( result.missing == null ) );
    }
    return result;
  };

  function CustomPromise( f ) {
    this._callbacks = [];

    var thisCustomPromise = this;
    var reject = function( reason ) {
      thisCustomPromise._result = reason;
      thisCustomPromise._success = false;
      thisCustomPromise._complete();
    };
    var resolve = function( value ) {
      thisCustomPromise._result = value;
      thisCustomPromise._success = true;
      thisCustomPromise._complete();
    };

    f( resolve, reject );
  }

  CustomPromise.prototype._complete = function() {
    if ( this._success != null )
    {
      var name = 'fail';
      if ( this._success )
      {
        name = 'succeed';
      }
      if ( this._callbacks.length > 0 )
      {
        for ( var i=0; i < this._callbacks.length; i++ )
        {
          var callback = this._callbacks[i];
          callback[name]( this._result );
        }
        this._callbacks = [];
      }
    }
  };

  CustomPromise.prototype.then = function( succeed, fail ) {
    this._callbacks.push( {
      fail: fail,
      succeed: succeed
    } );
    if ( this._success != null )
    {
      this._complete();
    }
    return this;
  };

  function isContextSetAuthorized( ctxKey, authCode ) {
    var authorized = false;
    if ( typeof( ctxKey ) === 'string' )
    {
      authorized = ( ( authCode === launchpadAuthCode ) || ( /^launchpad\./i.test( ctxKey ) !== true ) );
    }
    return authorized;
  }

  function isAngularPresent() {
    return ( typeof( angular ) === 'object' );
  }

  function getAngularAppElement() {
    var appEl;
    if ( isAngularPresent() && ( angular.element != null ) )
    {
      try
      {
        appEl = angular.element( '*[ng-app]' );
      }
      catch ( e )
      {
      }
    }
    return appEl;
  }

  var angularInjectionCache = {};
  function getAngularInjection( name, cache ) {
    cache = ( ( cache === true ) || ( typeof( cache ) === 'undefined' ) );
    var value;
    if ( name != null )
    {
      name = "" + name;
      if ( name.length > 0 )
      {
        if ( cache && ( angularInjectionCache.hasOwnProperty( name ) ) )
        {
          value = angularInjectionCache[name];
        }
        else
        {
          var appEl = getAngularAppElement();
          if ( appEl != null )
          {
            try
            {
              if ( appEl.injector != null )
              {
                var injector = appEl.injector();
                if ( injector.get != null )
                {
                  value = injector.get( name );
                }
              }
            }
            catch ( e )
            {
            }
          }
          angularInjectionCache[name] = value;
        }
      }
    }
    return value;
  }

  function getAngularHttp() {
    return getAngularInjection( "$http" );
  }

  function getAngularLog() {
    return getAngularInjection( "$log" );
  }

  function getAngularQ() {
    return getAngularInjection( "$q" );
  }

  function validateKey( key, label ) {
    if ( label == null )
    {
      label = '';
    }
    else
    {
      label = label + ': ';
    }

    var buffer = null;
    var keyType = typeof( key );
    if ( keyType !== 'string' )
    {
      adtranLogger.error( label + 'Invalid key type (' + keyType + ')' );
    }
    else
    {
      buffer = key.trim();
      if ( buffer.length < 1 )
      {
        adtranLogger.error( label + 'Invalid key (' + key + ')' );
        buffer = null;
      }
    }

    return buffer;
  }

  var httpCalls = {
    get: function (url, config) {
      if (isAngularPresent()) {
        return getAngularHttp().get(url, config);
      }

      adtranLogger.error('Angular not found. LaunchpadAPI HTTP does not support plain JS yet.');
    },
    delete: function (url, config) {
      if (isAngularPresent()) {
        return getAngularHttp().delete(url, config);
      }

      adtranLogger.error('Angular not found. LaunchpadAPI HTTP does not support plain JS yet.');
    },
    head: function (url, config) {
      if (isAngularPresent()) {
        return getAngularHttp().head(url, config);
      }

      adtranLogger.error('Angular not found. LaunchpadAPI HTTP does not support plain JS yet.');
    },
    jsonp: function (url, config) {
      if (isAngularPresent()) {
        return getAngularHttp().jsonp(url, config);
      }

      adtranLogger.error('Angular not found. LaunchpadAPI HTTP does not support plain JS yet.');
    },
    post: function (url, data, config) {
      if (isAngularPresent()) {
        return getAngularHttp().post(url, data, config);
      }

      adtranLogger.error('Angular not found. LaunchpadAPI HTTP does not support plain JS yet.');
    },
    put: function (url, data, config) {
      if (isAngularPresent()) {
        return getAngularHttp().put(url, data, config);
      }

      adtranLogger.error('Angular not found. LaunchpadAPI HTTP does not support plain JS yet.');
    },
    patch: function (url, data, config) {
      if (isAngularPresent()) {
        return getAngularHttp().patch(url, data, config);
      }

      adtranLogger.error('Angular not found. LaunchpadAPI HTTP does not support plain JS yet.');
    }
  };

  var _sharedContextCallbackPad = 'shared-';
  var sharedContextCalls = {
    get: function (key) {
      if (!pr.ready) {
        return null;
      }
      key = validateKey( key, 'sharedContext.get()' );
      if ( key != null ) {
        if (key in pr.sharedContext) {
          return pr.sharedContext[key];
        } else {
          return null;
        }
      }
      return null;
    },
    getAll: function () {
      return pr.sharedContext;
    },
    // Returns the number of shared context bindings.
    //
    // returns {number} The number of shared context bindings.
    getBindCount: function() {
      return getCBCountWithPrefix( _sharedContextCallbackPad );
    },
    // Retrieve a map of shared context bindings. Modifications to the map do not affect the actual shared context
    // bindings. However, if stored, the references may keep objects in memory longer than truly needed.
    //
    // returns {Object} An instance of LaunchpadBindingMap.
    getBindings: function() {
      var result = {};
      var names = getCBNames( _sharedContextCallbackPad );
      if ( names != null )
      {
        for ( var i=0; i < names.length; i++ )
        {
          var name = names[i];
          var bindings = copyCBData( name );
          if ( bindings != null )
          {
            result[name.substring( _sharedContextCallbackPad.length )] = bindings;
          }
        }
      }
      if ( result != null )
      {
        result = new LaunchpadBindingMap( result );
      }
      return result;
    },
    set: function( key, value, authCode ) {
      if (!pr.ready) {
        return null;
      }

      key = validateKey( key, 'sharedContext.set()' );
      if ( key != null )
      {
        if ( isContextSetAuthorized( key, authCode ) )
        {
          if (Object.prototype.toString.call(value) === "[object Array]" || JSON.stringify(value) === "{}") {
            adtranLogger.error( 'sharedContext.set(): Key \'' + key + '\' value should not be an array or empty object' );
            return null;
          }

          var setValue = [value]; //For future compatability we'll go ahead and make everything an array.

          pr.sharedContext[key] = setValue;
          invokeCallbacks(_sharedContextCallbackPad + key, setValue);
          invokeCallbacks('sharedContextChange');
          return pr.sharedContext[key];
        }
        else
        {
          adtranLogger.error( 'sharedContext.set(): Unauthorized key (' + key + ')' );
        }
      }
      return null;
    },
    update: function (key) {
      key = validateKey( key, 'sharedContext.update()' );
      if ( key != null )
      {
        invokeCallbacks(_sharedContextCallbackPad + key, pr.sharedContext[key]);
        invokeCallbacks('sharedContextChange');
      }
    },
    bind: function (key, callback) {
      if (!pr.ready) {
        adtranLogger.error('sharedContext.bind(): Binding to \'' + key + '\' before launchpadAPI ready');
      }
      key = validateKey( key, 'sharedContext.bind()' );
      if ( key != null ) {
        if (typeof (callback) === 'function') {
          storeCB(_sharedContextCallbackPad + key, callback);
        } else {
          adtranLogger.error('sharedContext.bind(): Invalid \'' + key + '\' callback function');
        }
      }
    },
    unbind: function (key, callback) {
      key = validateKey( key, 'sharedContext.unbind()' );
      if ( key != null ) {
        if (typeof (callback) === 'function') {
          removeCB(_sharedContextCallbackPad + key, callback);
        } else {
          adtranLogger.error('sharedContext.unbind(): Invalid \'' + key + '\' callback function');
        }
      }
    }
  };

  var resetPr = function () {
    pr = {
      //Private, singleton Vars
      verbose: false,
      callbackStore: {},
      ready: false,
      inLaunchpad: false,
      username: null,
      devloperMode: false,
      appSettings: {},
      context: {},
      sharedContext: {},
      token: null,

      inSidebar: false,
      setFrameLoaded: function () {},
      toast: function () {},
      blockWidget: function () {},
      isContextLocked: function () {},
      themeConfig: {},
      getUserPermissions: function () {},
      openSidebar: function () {},
    };
  };

  resetPr();

  // configure logging
  var adtranLogger = {
    _out: null,
    debug: null,
    info: null,
    log: null,
    warn: null,
    error: null,
    initialize: function() {
      if ( ( typeof( console ) === "object" ) && ( typeof( console.log ) === "function" ) )
      {
        adtranLogger.setOutput( console );
      }
      else
      {
        adtranLogger.setOutput( getAngularLog() );
      }
    },
    setOutput: function( out ) {
      if ( ( typeof( out ) !== "object" ) || ( typeof( out.log ) !== "function" ) )
      {
        out = null;
      }
      this._out = out;

      if ( this._out == null )
      {
        this.debug = function noWork() {};
        this.info = this.debug;
        this.log = this.debug;
        this.warn = this.debug;
        this.error = this.debug;
      }
      else
      {
        this.log = function( object ) {
          if ( pr.verbose )
          {
            this._out.log( object );
          }
        };

        if ( typeof( this._out.debug ) === "function" )
        {
          this.debug = function( object ) {
            if ( pr.verbose )
            {
              this._out.debug( object );
            }
          };
        }
        else
        {
          this.debug = this.log;
        }

        if ( typeof( this._out.info ) === "function" )
        {
          this.info = function( object ) {
            if ( pr.verbose )
            {
              this._out.info( object );
            }
          };
        }
        else
        {
          this.info = this.log;
        }

        if ( typeof( this._out.warn ) === "function" )
        {
          this.warn = function( object ) {
            this._out.warn( object );
          };
        }
        else
        {
          this.warn = function( object ) {
            this._out.log( object );
          };
        }

        if ( typeof( this._out.error ) === "function" )
        {
          this.error = function( object ) {
            this._out.error( object );
          };
        }
        else
        {
          this.error = this.warn;
        }
      }
    }
  };
  adtranLogger.initialize();

  var ensureArray = function (arr) {
    if (Object.prototype.toString.call(arr) !== '[object Array]') {
      arr = [];
    }
    return arr;
  };

  var storeCB = function (name, callback) {
    //Check to see if already existing
    var carr = ensureArray(pr.callbackStore[name]);
    for (var i = 0; i < carr.length; i++) {
      if (carr[i] === callback) {
        return;
      }
    }
    //If not, add it
    carr.push(callback);
    pr.callbackStore[name] = carr;
  };

  var removeCB = function (name, callback) {
    if ( ( name != null ) && ( callback != null ) )
    {
      var cbData = getCBData( name );
      if ( cbData != null )
      {
        var index = cbData.indexOf( callback );
        if ( index > -1 )
        {
          cbData.splice( index, 1 );
        }
      }
    }
  };

  /*jshint loopfunc: true */
  // Retrieve the total number of callbacks.
  //
  // param [name] {string} The optional callback name to match.
  // returns {number} The total number of callbacks.
  var getCBCount = function( name ) {
    var result = 0;
    if ( typeof( name ) === 'undefined' )
    {
      var names = getCBNames();
      for ( var i=0; i < names.length; i++ )
      {
        result += getCBCount( names[i] );
      }
    }
    else
    {
      var cbs = getCBData( name );
      if  ( cbs != null )
      {
        result = cbs.length;
      }
    }
    return result;
  };

  // Retrieve the total number of callbacks that have a name starting with the specified prefix.
  //
  // param prefix {string} Prefix string with which a callback name must match to be counted.
  // returns {number} The total number of callbacks.
  var getCBCountWithPrefix = function( prefix ) {
    var result = 0;
    if ( prefix != null )
    {
      var names = getCBNames( prefix );
      if ( names != null )
      {
        for ( var i=0; i< names.length; i++ )
        {
          result += getCBCount( names[i] );
        }
      }
    }
    return result;
  };

  // Retrieves the callback array with the specified callback name.
  //
  // param name {string} The callback name to match.
  // returns {Function[]} The callback array with the specified callback name.
  var getCBData = function( name ) {
    var result;
    if ( ( name != null ) && ( pr != null ) )
    {
      var cbStore = pr.callbackStore;
      if ( cbStore != null )
      {
        result = cbStore[name];
      }
    }
    return result;
  };

  // Copies of the callback array with the specified callback name.
  //
  // param name {string} The callback name to match.
  // param [copyEmpty] {boolean} True if an empty callback array should be returned. Default is false.
  // returns {Function[]} A copy fo the callback array with the specified callback name.
  var copyCBData = function( name, copyEmpty ) {
    copyEmpty = ( copyEmpty === true );
    var result;
    var cb = getCBData( name );
    if ( cb == null )
    {
      result = cb;
    }
    else if ( copyEmpty || cb.length > 0 )
    {
      result = [];
      for ( var i=0; i < cb.length; i++ )
      {
        result.push( cb[i] );
      }
    }
    return result;
  };

  // Retrieve list of callback names.
  //
  // param [prefix] {string} Optional prefix string with which a callback name must match to be returned.
  // param [ignoreEmpty] {boolean} Optional flag to ignore callback names with no registered callbacks. Defaults to true.
  // returns {string[]} Array of callback names if successful or undefined on error.
  var getCBNames = function( prefix, ignoreEmpty ) {
    ignoreEmpty = ( ( typeof( ignoreEmpty ) === 'undefined' ) || ( ignoreEmpty === true ) );
    var result;
    var prefixType = typeof( prefix );
    if ( ( prefixType === 'undefined' ) || ( ( prefixType === 'string' ) && ( prefix.length > 0 ) ) )
    {
      result = [];
      if ( pr != null )
      {
        var cbStore = pr.callbackStore;
        if ( cbStore != null )
        {
          for ( var name in cbStore )
          {
            if ( cbStore.hasOwnProperty( name ) )
            {
              if ( ignoreEmpty )
              {
                var cb = cbStore[name];
                if ( ( cb == null ) || ( cb.length < 1 ) )
                {
                  name = null;
                }
              }
              if ( name != null )
              {
                if ( ( prefix == null ) ||
                  ( ( name.length >= prefix.length ) && ( name.substring( 0, prefix.length ) === prefix ) ) )
                {
                  result.push( name );
                }
              }
            }
          }
        }
      }
    }
    return result;
  };

  /*jshint loopfunc: true */
  var invokeCallbacks = function( name, arg ) {
    var $q, promise;
    if ( isAngularPresent() )
    {
      $q = getAngularQ();
    }

    function work( resolve, reject ) {
      var argDefined = ( typeof( arg ) !== 'undefined' );
      var cbResults = null;
      if ( ( resolve != null ) && ( reject != null ) )
      {
        cbResults = {
          count: 0,
          data: [],
          execErrors: [],
          execSuccess: false
        };
      }
      var cb;
      var carr = ensureArray( pr.callbackStore[name] );
      for ( var cbIdx = 0; cbIdx < carr.length; cbIdx++ )
      {
        cb = carr[cbIdx];
        if ( typeof( cb ) === 'function' )
        {
          if ( cbResults != null )
          {
            cbResults.execSuccess = true;
            cbResults.count++;
          }
          window.setTimeout( function scheduledCallback() {
            var error, result;
            try
            {
              if ( argDefined )
              {
                result = cb( arg );
              }
              else
              {
                result = cb();
              }
            }
            catch ( e )
            {
              error = e;
              adtranLogger.error( cb.name + " function call failed due to " + e );
            }

            if ( cbResults != null )
            {
              cbResults.data.push( result );
              cbResults.execErrors.push( error );
              cbResults.execSuccess = cbResults.execSuccess && ( error == null );
              if ( cbResults.data.length === cbResults.count )
              {
                try
                {
                  if ( cbResults.execSuccess )
                  {
                    resolve( cbResults );
                  }
                  else
                  {
                    reject( cbResults );
                  }
                }
                catch ( e )
                {
                  adtranLogger.error( e );
                }
              }
            }
          }, 0 );
        }
      }

      if ( ( cbResults != null ) && ( cbResults.count < 1 ) )
      {
        try
        {
          reject( cbResults );
        }
        catch ( e )
        {
          adtranLogger.error( e );
        }
      }
    }

    if ( $q == null )
    {
      promise = new CustomPromise( work );
    }
    else
    {
      promise = $q( work );
    }
    return promise;
  };

  // Returns an array of valid callback names.
  //
  // returns {string[]} An array of valid callback names.
  var getValidCBNames = function() {
    return [
      'listeningLockChanged',
      'contextChange',
      'localSettingsChange',
      'menuClick',
      'ready',
      'requestingWidgetClose',
      'requestingWidgetLaunch',
      'savingWorkboard',
      'sharedContextChange'
    ];
  };

  var cbNameValid = function (name) {
    var validCBs = getValidCBNames();
    return validCBs.indexOf(name) !== -1;
  };

  var readyNow = function () {
    invokeCallbacks('ready');
    pr.ready = true;
    adtranLogger.log('API Ready');
  };

  var validSettingsType = function (object) {
    if (typeof (object) === 'boolean' || typeof (object) === 'number' || typeof (object) === 'string') {
      return true;
    }
    if (typeof (object) === 'object') {
      if (object instanceof Date) {
        return false;
      }
      var valid = true;
      for (var key in object) {
        if (!validSettingsType(object[key])) {
          return false;
        }
      }
      return true;
    }

    return false;
  };

  //For Public
  var initialize = function (data) {

    function storeFunctionProperty( data, name, throwError, optional ) {
      throwError = ( throwError === true );
      optional = ( optional === true );
      if ( ( optional && data.hasOwnProperty( name ) ) || ( !optional ) )
      {
        var defaultFunc = function() {
          adtranLogger.error( 'launchpadAPI initialized with invalid ' + name + ' method' );
          if ( throwError )
          {
            throw new Error( 'launchpadAPI method ' + name + ' not defined' );
          }
        };
        storeProperty( data, name, 'function', defaultFunc );
      }
      else if ( pr.hasOwnProperty( name ) )
      {
        delete pr[name];
      }
    }

    function storeHttpCalls( http, name ) {
      var value = http[name];
      if ( typeof( value ) === 'function' )
      {
        httpCalls[name] = value;
      }
      else
      {
        invalidData.push( 'http["' + name + '"]' );
      }
    }

    function storeProperty( data, name, type, defaultValue, validationEnabled ) {
      storePropertyValue( data[name], name, type, defaultValue, validationEnabled );
    }

    function storePropertyValue( value, name, type, defaultValue, validationEnabled ) {
      validationEnabled = ( ( typeof( validationEnabled ) === 'undefined' ) || ( validationEnabled === true ) );
      if ( typeof( value ) === type )
      {
        pr[name] = value;
      }
      else
      {
        if ( validationEnabled )
        {
          invalidData.push( name );
        }
        pr[name] = defaultValue;
      }
    }

    adtranLogger.log('launchpadAPI._init(): Received the following data from the Launchpad:');
    adtranLogger.log(data);

    var name;
    var invalidData = [];

    storeProperty( data, 'appSettings', 'object', {} );
    storeFunctionProperty( data, 'blockWidget' );
    storeProperty( data, 'context', 'object', {} );
    storeProperty( data, 'devloperMode', 'boolean', false );
    storeFunctionProperty( data, 'getWindowProperties', true, true );
    storeFunctionProperty( data, 'getWindowProperty', true, true );
    storeFunctionProperty( data, 'hasFeatureValue', true, true );
    storeFunctionProperty( data, 'isContextLocked' );
    // convert isSidebar -> inSidebar
    storePropertyValue( data.isSidebar, 'inSidebar', 'boolean', false );
    storeFunctionProperty( data, 'setFrameLoaded' );
    storeFunctionProperty( data, 'setWindowProperty', true );
    storeProperty( data, 'sharedContext', 'object', {}, false );
    storeProperty( data, 'themeConfig', 'object', {} );
    storeFunctionProperty( data, 'toast' );
    storeProperty( data, 'token', 'string', 'Invalid Token' );
    storeProperty( data, 'username', 'string', 'Invalid Username' );
    storeFunctionProperty( data, 'getUserPermissions' );
    storeFunctionProperty( data, 'openSidebar' );

    if ( data.http != null )
    {
      storeHttpCalls( data.http, 'delete' );
      storeHttpCalls( data.http, 'get' );
      storeHttpCalls( data.http, 'head' );
      storeHttpCalls( data.http, 'jsonp' );
      storeHttpCalls( data.http, 'patch' );
      storeHttpCalls( data.http, 'post' );
      storeHttpCalls( data.http, 'put' );
    }

    if ( invalidData.length > 0 )
    {
      invalidData.sort();
      var msg = 'launchpadAPI._init(): Using defaults for ' + invalidData.length + ' invalid data fields (';
      for ( var i=0; i < invalidData.length; i++ )
      {
        if ( i > 0 )
        {
          msg += ', ';
        }
        msg += invalidData[i];
      }
      msg += ')';
      adtranLogger.warn( msg );
    }

    readyNow();
  };

  var overrideSharedContext = function (sc) {
    if (typeof (sc.get) === 'function') {
      sharedContextCalls.get = sc.get;
    }
    if (typeof (sc.getAll) === 'function') {
      sharedContextCalls.getAll = sc.getAll;
    }
    if (typeof (sc.set) === 'function') {
      sharedContextCalls.set = sc.set;
    }
    if (typeof (sc.bind) === 'function') {
      sharedContextCalls.bind = sc.bind;
    }
    if (typeof (sc.update) === 'function') {
      sharedContextCalls.update = sc.update;
    }
    if (typeof (sc.unbind) === 'function') {
      sharedContextCalls.unbind = sc.unbind;
    }
  };

  //Public
  var obj = {
    //Public API
    LaunchpadBindingMap: LaunchpadBindingMap,

    // Retrieves the version information for the API.
    //
    // returns {Object} The version information for the API.
    getApiVersion: function () {
      // return a new object to insure the version cannot be modified externally
      return {
        major: apiVersion.major,
        minor: apiVersion.minor,
        fix: apiVersion.fix,
        string: apiVersion.string
      };
    },
    // Retrieve the total number of bindings.
    //
    // param [name] {string} The optional binding name to match.
    // returns {number} The total number of bindings.
    getBindCount: function( name ) {
      var result = 0;
      if ( typeof( name ) === 'undefined' )
      {
        var names = getValidCBNames();
        for ( var i=0; i < names.length; i++ )
        {
          result += this.getBindCount( names[i] );
        }
      }
      else if ( cbNameValid( name ) )
      {
        result = getCBCount( name );
      }
      return result;
    },
    // Retrieves an array of valid bind names. Modifications to the array do not affect functionality.
    //
    // returns {string[]} An array of valid bind names.
    getBindNames: function() {
      var names = getValidCBNames();
      var copy = [];
      if ( names != null )
      {
        for ( var i=0; i < names.length; i++ )
        {
          copy.push( names[i] );
        }
      }
      return copy;
    },
    // Retrieve a map of bindings. Modifications to the map do not affect the actual bindings. However, if stored, the
    // references may keep objects in memory longer than truly needed.
    //
    // param [name] {string} The optional binding name to match.
    // returns {Object} An instance of LaunchpadBindingMap if successful.
    getBindings: function( name ) {

      function initCBData( name ) {
        var cbs = copyCBData( name, true );
        if ( cbs == null )
        {
          cbs = [];
        }
        return cbs;
      }

      var result;
      if ( typeof( name ) === 'undefined' )
      {
        result = {};
        var names = getValidCBNames();
        for ( var i=0; i < names.length; i++ )
        {
          name = names[i];
          result[name] = initCBData( name );
        }
      }
      else if ( cbNameValid( name ) )
      {
        var cbs = copyCBData( name, true );
        if ( cbs == null )
        {
          cbs = [];
        }
        result = {};
        result[name] = initCBData( name );
      }
      if ( result != null )
      {
        result = new LaunchpadBindingMap( result );
      }
      return result;
    },
    blockWidget: function () {
      pr.blockWidget();
    },
    toggleAnimationOff: function () {
      pr.setFrameLoaded(true);
    },
    toggleAnimationOn: function () {
      pr.setFrameLoaded(false);
    },
    bind: function (name, callback) {
      if (cbNameValid(name)) {
        if (typeof (callback) === 'function') {
          storeCB(name, callback);
          //Automatically callback 'ready' if it has already been called
          if (name === 'ready' && pr.ready === true) {
            callback();
          }
        } else {
          adtranLogger.error('bind(): Invalid callback function');
        }
      } else {
        adtranLogger.error('bind(): Invalid callback name \'' + name + '\'');
      }
    },
    unbind: function (name, callback) {
      if (cbNameValid(name)) {
        removeCB(name, callback);
      } else {
        adtranLogger.error('unbind(): Invalid callback name \'' + name + '\'');
      }
    },
    _incommingCalls: function (name) {
      if (cbNameValid(name)) {
        invokeCallbacks(name);
      } else {
        adtranLogger.error('_incommingCalls(): Invalid callback name \'' + name + '\'');
      }
    },
    initLogger: function() {
      adtranLogger.initialize();
    },
    isContextLocked: function () {
      if (!pr.ready) {
        return null;
      }
      return pr.isContextLocked();
    },
    inSidebar: function () {
      if (!pr.ready) {
        return null;
      }
      return pr.inSidebar;
    },
    inLaunchpad: function () {
      if (!pr.ready) {
        return null;
      }
      return pr.inLaunchpad;
    },
    getUsername: function () {
      if (!pr.ready) {
        return null;
      }
      if (pr.inLaunchpad) {
        return pr.username;
      } else {
        return 'username';
      }
    },
    getToken: function () {
      if (!pr.ready) {
        return null;
      }
      if (pr.inLaunchpad) {
        return pr.token;
      } else {
        return 'token';
      }
    },
    getThemeConfig: function () {
      if (!pr.ready || !pr.inLaunchpad) {
        return null;
      }
      return pr.themeConfig;
    },
    hasFeatureValue: function( key, value ) {
      var featureSupport;
      if ( pr.ready && pr.inLaunchpad ) {
        featureSupport = pr.hasFeatureValue( key, value );
      }
      return featureSupport;
    },
    getWindowProperties: function( key ) {
      var value;
      if ( pr.ready && pr.inLaunchpad ) {
        value = pr.getWindowProperties();
      }
      return value;
    },
    getWindowProperty: function( key ) {
      var value;
      if ( pr.ready && pr.inLaunchpad && (pr.getWindowProperty !== undefined)) {
        value = pr.getWindowProperty( key );
      }
      return value;
    },
    setWindowProperty: function( key, value ) {
      var prevValue;
      if ( pr.ready && pr.inLaunchpad ) {
        prevValue = pr.setWindowProperty( key, value );
      }
      return prevValue;
    },
    setVerbose: function (vb) {
      if (typeof (vb) === 'boolean') {
        pr.verbose = vb;
      }
    },
    notification: {
      trace: function (message) {
        if (message !== null) {
          pr.toast(message, 'success');
        }
      },
      debug: function (message) {
        if (message !== null) {
          pr.toast(message, 'success');
        }
      },
      info: function (message) {
        if (message !== null) {
          pr.toast(message, 'success');
        }
      },
      warn: function (message) {
        if (message !== null) {
          pr.toast(message, 'warning');
        }
      },
      error: function (message) {
        if (message !== null) {
          pr.toast(message, 'failure');
        }
      },
      fatal: function (message) {
        if (message !== null) {
          pr.blockWidget(message);
        }
      }
    },
    appSettings: {
      all: function () {
        if (!pr.ready || !pr.inLaunchpad) {
          return null;
        }
        return pr.appSettings;
      },
      get: function (key) {
        if (!pr.ready || !pr.inLaunchpad) {
          return null;
        }
        key = validateKey( key, 'appSettings.get()' );
        if ( key != null ) {
          if (pr.appSettings.hasOwnProperty(key)) {
            return pr.appSettings[key];
          } else {
            adtranLogger.warn('appSettings.get(): No setting with key \'' + key + '\'');
          }
        }
        return null;
      },
      set: function( key, value, authCode ) {
        if (!pr.ready || !pr.inLaunchpad) {
          return null;
        }
        key = validateKey( key, 'appSettings.set()' );
        if ( key != null ) {
          if (validSettingsType(value) && value !== null) {
            if (pr.appSettings[key] !== value) {
              pr.appSettings[key] = value;
              invokeCallbacks('localSettingsChange');
            } else {
              adtranLogger.log('appSettings.set(): Key \'' + key + '\' value has not changed');
            }
            return pr.appSettings[key];
          } else {
            adtranLogger.error('appSettings.set(): Invalid key \'' + key + '\' value (' + value + ')');
          }
        }
        return null;
      },
      remove: function (key) {
        if (!pr.ready || !pr.inLaunchpad) {
          return null;
        }
        key = validateKey( key, 'appSettings.remove()' );
        if ( key == null ) {
          return false;
        } else {
          if (pr.appSettings.hasOwnProperty(key)) {
            delete pr.appSettings[key];
            invokeCallbacks('localSettingsChange');
            return true;
          } else {
            adtranLogger.log('appSettings.remove(): No setting with key \'' + key + '\'');
            return false;
          }
        }
      }
    },
    sharedContext: {
      get: function (key) {
        return sharedContextCalls.get(key);
      },
      getAll: function () {
        return sharedContextCalls.getAll();
      },
      getBindCount: function() {
        return sharedContextCalls.getBindCount();
      },
      getBindings: function() {
        return sharedContextCalls.getBindings();
      },
      set: function (key, value, authCode) {
        return sharedContextCalls.set(key, value, authCode);
      },
      update: function (key) {
        return sharedContextCalls.update(key);
      },
      bind: function (key, callback) {
        return sharedContextCalls.bind(key, callback);
      },
      unbind: function (key, callback) {
        return sharedContextCalls.unbind(key, callback);
      }
    },
    context: {
      all: function () {
        if (!pr.ready || !pr.inLaunchpad) {
          return null;
        }

        return pr.context;
      },
      get: function (key) {
        if (!pr.ready || !pr.inLaunchpad) {
          return null;
        }
        key = validateKey( key, 'context.get()' );
        if ( key != null ) {
          if (pr.context.hasOwnProperty(key)) {
            return pr.context[key];
          } else {
            adtranLogger.log('context.get(): No setting with key \'' + key + '\'');
          }
        }
        return null;
      },
      set: function( key, value, authCode ) {
        if (!pr.ready || !pr.inLaunchpad) {
          return null;
        }
        key = validateKey( key, 'context.set()' );
        if ( key != null )
        {
          if ( isContextSetAuthorized( key, authCode ) )
          {
            if (Object.prototype.toString.call(value) === "[object Object]") {
              pr.context[key] = value;
              invokeCallbacks('contextChange');

              return pr.context[key];
            } else {
              adtranLogger.error('context.set(): Invalid key \'' + key + '\' value (' + value + ')');
            }
          }
          else
          {
            adtranLogger.error('context.set(): Unauthorized key (' + key + ')');
          }
        }
        return null;
      },
      remove: function (key) {
        if (!pr.ready || !pr.inLaunchpad) {
          return null;
        }
        key = validateKey( key, 'context.remove()' );
        if ( key == null ) {
          return false;
        } else {
          if (pr.context.hasOwnProperty(key)) {
            delete pr.context[key];
            invokeCallbacks('contextChange');
            return true;
          } else {
            adtranLogger.log('context.remove(): No setting with key \'' + key + '\'');
            return false;
          }
        }
      }
    },

    apps: {
      close: function () {
        var promise;
        if ( pr.ready && pr.inLaunchpad )
        {
          promise = invokeCallbacks( 'requestingWidgetClose' );
        }
        return promise;
      },
      launch: function (appId, context, resource, title) {
        if (!pr.ready || !pr.inLaunchpad) {
          return null;
        }
        if (typeof (appId) === 'string' && appId !== '') {
          invokeCallbacks('requestingWidgetLaunch', {
            appId: appId,
            context: context,
            resource: resource,
            title: title
          });
          return appId;
        } else {
          adtranLogger.error('apps.launch(): Invalid appId parameter');
        }
        return null;
      }
    },
    getDevloperMode: function () {
      if (!pr.ready) {
        return null;
      }
      return pr.devloperMode;
    },
    http: {
      get: function (url, config) {
        if (typeof (config) !== 'object') {
          config = {};
        }
        if (!config.hasOwnProperty('headers')) {
          config.headers = {
            'Accept': 'application/yang-data+json'
          };
        } else if (!config.headers.hasOwnProperty('Accept')) {
          config.headers.Accept = 'application/yang-data+json';
        }
        return httpCalls.get(url, config);
      },
      delete: function (url, config) {
        return httpCalls.delete(url, config);
      },
      head: function (url, config) {
        return httpCalls.head(url, config);
      },
      jsonp: function (url, config) {
        return httpCalls.jsonp(url, config);
      },
      post: function (url, data, config) {
        return httpCalls.post(url, data, config);
      },
      put: function (url, data, config) {
        return httpCalls.put(url, data, config);
      },
      patch: function (url, data, config) {
        return httpCalls.patch(url, data, config);
      }
    },
    doesUserHavePermissions: function(permissions) {
      if (!pr.ready || !pr.inLaunchpad) {
        return Promise.resolve(null);
      }

      if (!Array.isArray(permissions)) {
        return Promise.resolve(false);
      }

      return pr.getUserPermissions().then(function(response) {
        if (response) {
          for (var i = 0; i < permissions.length; i++) {
            if (response.indexOf(permissions[i]) === -1) {
              return false;
            }
          }

          return true;
        }

        return false;
      });
    },
    openSidebar: function() {
      pr.openSidebar();
    },
    //Semi-private functions
    _register: function () {
      adtranLogger.initialize();
      adtranLogger.log('launchpadAPI._register(): Searching for Launchpad');
      try {
        if (typeof (parentWindow) === 'object' && parentWindow !== null) {
          if (typeof (parentWindow.isLaunchpad) === 'boolean' && parentWindow.isLaunchpad) {
            pr.inLaunchpad = true;
            adtranLogger.log('Launchpad detected');
            if (typeof (parentWindow.registerApp) === 'function') {
              parentWindow.registerApp();
            }
          } else {
            pr.inLaunchpad = false;
          }
        } else {
          pr.inLaunchpad = false;
        }
      } catch (e) {
        if (typeof (e.message) !== 'undefined' && e.message.toLowerCase().indexOf('permission denied') !== -1) {
          var errorMessage = 'Error: launchpadAPI - Permission denied to access frame parent. Assuming parent is the Launchpad, but no data can be retrieved or sent. Check the same-origin policy.';
          adtranLogger.warn( errorMessage );
          pr.inLaunchpad = true;
          initialize({});
        } else {
          throw e;
        }
      }


      if (pr.inLaunchpad === false) {
        adtranLogger.log('In standalone mode');
        readyNow();
      }

      return pr.inLaunchpad;
    },
    _init: function (data) {
      initialize(data);
    },
    _overrideSC: function (sc) {
      overrideSharedContext(sc);
    },

    //Semi-private functions for testing only
    _pr: function () {
      return pr;
    },
    _reset: function () {
      resetPr();
    },
    _mockParent: function (mock) {
      parentWindow = mock;
    }
  };

  return obj;
})();

launchpadAPI.setVerbose(false);
launchpadAPI._register();
