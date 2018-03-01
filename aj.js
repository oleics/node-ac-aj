
var DELIMITER = ':';
var EXPOSE_FN = [
  'availableActions',
  'set',
  'remove',
  'batch',
  'run',
  'on', 'once', 'off', 'removeListener', 'removeAllListeners',
  'onAny', 'offAny',
];

var inherits = require('inherits');
var EventEmitter = require('eventemitter2').EventEmitter2;

module.exports = Aj;

function noop() {}

var emitterOptions = {
  wildcard: true,
  delimiter: DELIMITER,
  maxListeners: +Infinity,
  newListener: false,
  verboseMemoryLeak: false,
};

function Aj(map) {
  if(!(this instanceof Aj)) return new Aj(map);
  EventEmitter.call(this, emitterOptions);

  this._em = new EventEmitter(emitterOptions);
  this._fns = [];
  this._events = [];

  if(map != null) {
    this.setByMap(map);
  }

  var self = this;
  function aj(events, data) {
    events = normalizeEvents(events);
    return self.batch(events, data);
  }
  EXPOSE_FN.forEach(function(key){
    aj[key] = bindFn(self[key], self);
  });
  return aj;
}

inherits(Aj, EventEmitter);

Aj.prototype.availableActions = function() {
  var actions = [];
  this._events.forEach(function(events){
    events.forEach(function(event){
      if(actions.indexOf(event) === -1) {
        actions.push(event);
      }
    });
  });
  return actions;
};

Aj.prototype.set = function(fn, events) {
  if(events == null) {
    return this.setByMap(fn);
  }
  var self = this;
  var index = self._fns.indexOf(fn);
  events = normalizeEvents(events, DELIMITER);
  if(index === -1) {
    index = self._fns.length;
    self._fns.push(fn);
    self._events.push(events);
  } else {
    events.forEach(function(event){
      if(!self._events[index].indexOf(event) === -1) {
        self._events[index].push(event);
      } else {
        self._em.removeListener(event, fn);
      }
    });
  }
  self._events[index].forEach(function(event){
    self._em.on(event, fn);
  });
  return self;
};

Aj.prototype.remove = function(fn, /* optional */ events) {
  var self = this;
  var index = self._fns.indexOf(fn);
  if(index === -1) return self;
  events = normalizeEvents(events, DELIMITER);
  if(events) {
    // remove a slice
    self._events[index] = self._events[index].filter(function(event){
      if(events.indexOf(event) === -1) {
        return true;
      }
      self._em.removeListener(event, fn);
      return false;
    });
    if(self._events[index].length === 0) {
      self._events.splice(index, 1);
      self._fns.splice(index, 1);
    }
    return self;
  }
  // remove all
  self._events[index].forEach(function(event){
    self._em.removeListener(event, fn);
  });
  self._events.splice(index, 1);
  self._fns.splice(index, 1);
  return self;
};

Aj.prototype.batch = function(events, data) {
  var self = this;
  var promise = Promise.resolve(data);
  events.forEach(function(event){
    promise = promise.then(function(data){
      return self.run(event, data);
    });
  });
  return promise;
};

Aj.prototype.run = function(event, data) {
  var self = this;
  var listeners = this._em.listeners(event).slice(0);
  if(listeners.length === 0) {
    console.log('No fn for action:', event);
  }
  return Resolver(listeners)(data).then(function(data){
    self.emit(event, data);
    return data;
  });
};

//

Aj.prototype.action = function(events) {
  var self = this;
  events = normalizeEvents(events);
  return function(data){
    return self.batch(events, data);
  };
};

// set by map

Aj.prototype.setByMap = function(map) {
  Object.keys(map).forEach(function(event){
    this.set(event, map[event]);
  }, this);
  return this;
};

// TODO: combine many into one

// Aj.prototype.combine = function(aj1, aj2, ...) {
// };

// Static

function Resolver(listeners) {
  return resolve;
  function resolve(data) {
    if(data instanceof Promise) {
      return data.then(resolve);
    }
    if(listeners.length === 0) return Promise.resolve(data);
    var res = listeners.shift()(data);
    if(res == null) res = data;
    return resolve(res);
  }
}

function normalizeEvents(events, delimiter) {
  if(!events) return events;
  if(typeof events !== 'array' && !(events instanceof Array)) events = [events];
  if(delimiter != null) {
    events = events.map(function(event){
      if(event.join) {
        event = event.join(delimiter);
      }
      return event;
    });
  }
  return events;
}

function bindFn(fn, scope) {
  return function(){
    return fn.apply(scope, arguments);
  };
  // return fn.bind(scope);
}
