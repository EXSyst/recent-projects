var MAX_RECENT_PROJECTS = 20;

require('./findIndex');
var path = require ("path");
var fs = require ("fs");
var hasProp = {}.hasOwnProperty;
var storagePath = path.join(atom.getConfigDirPath(), 'storage', 'recent-projects.json');

var read = function(callback) {
  var error, statePath, stateString;
  try {
    stateString = fs.readFileSync(storagePath, 'utf8');
  } catch (_error) {
    if (_error.code !== 'ENOENT') {
      var errorMessage = "Error reading recent projects file: " + storagePath;
      console.warn(errorMessage, _error.stack, _error);
      return callback(errorMessage);
    }
    return callback(null, []);
  }
  try {
    var projects = JSON.parse(stateString);
  } catch (_error) {
    var errorMessage = "Error parsing recent projects file: " + storagePath;
    console.warn(errorMessage, _error.stack, _error);
    return callback(errorMessage);
  }
  return callback(null, projects);
};

var write = function(data, callback) {
  try {
    fs.writeFileSync(storagePath, JSON.stringify(data), 'utf8');
  } catch (_error) {
    var errorMessage = "Error writing recent projects file: " + storagePath;
    console.warn(errorMessage, _error.stack, _error);
    if(callback != null) {
      return callback(errorMessage);
    }
  }
  if(callback != null) {
    return callback(null, data);
  }
};

var alter = function(fn, callback) {
  return read(function(err, data) {
    if (err != null) {
      if (callback != null) {
        return callback(err);
      }
    } else {
      fn(data);
      return write(data, callback);
    }
  });
};

// TODO
var unlink = function(callback) {
  return callback(null, store.remove('recent-projects'));
};

var comparePaths = function(arg) {
  this.sort();
  paths = arg.paths;
  if(paths.length == this.length && paths.every(
    (function(_this) {
      return function(v, i) { return v === _this[i]; };
    }) (this)
  )) {
    return true;
  }
};

module.exports = {
  add: function(paths, metadata, callback) {
    var entry = {};
    var k;
    for (k in metadata) {
      if (!hasProp.call(metadata, k)) continue;
      var v = metadata[k];
      entry[k] = v;
    }
    entry.paths = paths.sort();
    entry.lastOpened = Date.now();
    var fn = function(data) {
      data.forEach(function(row, i) {
        if(typeof row.paths === 'undefined') {
          data.splice(i, 1);
        }
      });
      var pos = data.findIndex(comparePaths, paths);
      if (pos >= 0) {
        data.splice(pos, 1);
      }
      data.unshift(entry);
      return data.splice(MAX_RECENT_PROJECTS);
    };
    return alter(fn, callback);
  },
  remove: function(paths, callback) {
    var fn = function(data) {
      var pos = data.findIndex(comparePaths, paths);
      if (pos >= 0) {
        return data.splice(pos, 1);
      }
    };
    return alter(fn, callback);
  },
  get: function(callback) {
    return read(callback);
  },
  clear: function(callback) {
    return unlink(callback);
  }
};
