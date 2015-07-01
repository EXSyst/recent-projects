var MAX_RECENT_PROJECTS = 20;

require('./findIndex');
var path = require('path');
var fs = require('fs');
var hasProp = {}.hasOwnProperty;

var getStateFilePath = function() {
  return path.join(atom.getConfigDirPath(), 'recent-projects.json');
};

var read = function(callback) {
  return fs.readFile(getStateFilePath(), {
    encoding: 'utf8'
  }, callback ? function(err, data) {
    var missing, projects;
    if (err != null) {
      if (err.code === 'ENOENT') {
        return callback(null, []);
      } else {
        return callback(err);
      }
    } else {
      data = JSON.parse(data);
      projects = [];
      missing = data.length;
      return data.forEach(function(project, i) {
        if (typeof project === 'string') {
          project = {
            uri: project
          };
        }
        return fs.exists(project.uri, function(retval) {
          projects.push(project);
          if (--missing === 0) {
            return callback(null, projects);
          }
        });
      });
    }
  } : void 0);
};

var write = function(data, callback) {
  return fs.truncate(getStateFilePath(), 0, (function(_this) {
    return function(err) {
      if ((err != null) && err.code !== "ENOENT") {
        if (callback != null) {
          return callback(err);
        }
      } else {
        return fs.writeFile(getStateFilePath(), JSON.stringify(data), {
          encoding: 'utf8'
        }, callback);
      }
    };
  })(this));
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

var unlink = function(callback) {
  return fs.unlink(getStateFilePath(), callback);
};

var compareUri = function(arg) {
  return arg.uri === this.valueOf();
};

module.exports = {
  add: function(uri, metadata, callback) {
    var entry = {};
    var k;
    for (k in metadata) {
      if (!hasProp.call(metadata, k)) continue;
      var v = metadata[k];
      entry[k] = v;
    }
    entry.uri = uri;
    entry.lastOpened = Date.now();
    var fn = function(data) {
      var pos = data.findIndex(compareUri, uri);
      if (pos >= 0) {
        data.splice(pos, 1);
      }
      data.unshift(entry);
      return data.splice(MAX_RECENT_PROJECTS);
    };
    return alter(fn, callback);
  },
  remove: function(uri, callback) {
    var fn = function(data) {
      var pos = data.findIndex(compareUri, uri);
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
