/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function(global) {

  var VibeSocket = {};
  
  global["VibeSocket"] = VibeSocket;

  var util = {};

  (function() {
    var re = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
  
    var parts = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password',
                 'host', 'port', 'relative', 'path', 'directory', 'file', 'query',
                 'anchor'];
  
    util.parseUri = function (str) {
      var m = re.exec(str || '')
        , uri = {}
        , i = 14;
  
      while (i--) {
        uri[parts[i]] = m[i] || '';
      }
  
      return uri;
    };

    /**
     * Produces a unique url that identifies a Socket.IO connection.
     *
     * @param {Object} uri
     * @api public
     */
  
    util.uniqueUri = function (uri) {
      var protocol = uri.protocol
        , host = uri.host
        , port = uri.port;
  
      if ('document' in global) {
        host = host || document.domain;
        port = port || (protocol == 'https'
          && document.location.protocol !== 'https:' ? 443 : document.location.port);
      } else {
        host = host || 'localhost';
  
        if (!port && protocol == 'https') {
          port = 443;
        }
      }
  
      return (protocol || 'http') + '://' + host + ':' + (port || 80);
    };
  })();

  function Socket(opts) {
    this.options = opts;
    var uri = (opts.secure ? "wss" : "ws") + "://" + opts.host + ":" + opts.port + opts.uri.path;

    var ws = new WebSocket(uri);
    this.ws = ws;

    this.$handlers = {};

    var self = this;

    ws.onopen = function(event) {
      self.emit("connect", event);
    };

    ws.onclose = function(event) {
      self.emit("disconnect", event);
    };

    ws.onmessage = function(event) {
      self.emit("message", JSON.parse(event.data));
    };
  };

  Socket.prototype.emit = function() {
    var args = [].splice.call(arguments, 0);
    var signal = args.splice(0, 1);
    var handlers = this.$handlers[signal];
    if(handlers !== undefined) {
      handlers.forEach(function(h) {
        h.apply(null, args);
      });
    }
  };

  Socket.prototype.on = function(signal, h) {
    if(this.$handlers[signal] === undefined) {
      this.$handlers[signal] = [];
    }
    this.$handlers[signal].push(h);
  };

  Socket.prototype.send = function(data) {
    this.ws.send(JSON.stringify(data));
  }

  VibeSocket.connect = function(host) {
    var uri = util.parseUri(host)
      , uuri
      , socket;

    if (global && global.location) {
      uri.protocol = uri.protocol || global.location.protocol.slice(0, -1);
      uri.host = uri.host || (global.document
        ? global.document.domain : global.location.hostname);
      uri.port = uri.port || global.location.port;
    }

    uuri = util.uniqueUri(uri);

    var options = {
        host: uri.host
      , secure: 'https' == uri.protocol
      , port: uri.port || ('https' == uri.protocol ? 443 : 80)
      , query: uri.query || ''
      , uri: uri
    };

    return new Socket(options);    
  };

})(this);
