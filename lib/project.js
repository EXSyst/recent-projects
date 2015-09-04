var path = require('path');
var fs = require('fs');
var GitRepository = require('atom').GitRepository;

function Project(options) {
  if (Object.getPrototypeOf(options) !== Object.prototype) {
    throw new Error('Project constructor parameter must be an Object. (Ex: {foodata: \'foo\'})');
  }
  if (typeof options.paths === 'undefined') {
    throw new Error('You must provide paths to create a project.');
  }
  if (!Array.isArray(options.paths)) {
    throw new Error('"paths" option must be an array.');
  }
  this.paths = options.paths;

  if (typeof options.devMode !== 'undefined') {
    if (options.devMode instanceof Boolean) {
      throw new Error('"devMode" parameter must be a Boolean.');
    }
    this.devMode = options.devMode;
  } else {
    this.devMode = false;
  }

  if (typeof options.lastOpened !== 'undefined' && options.lastOpened !== null) {
    this.lastOpened = options.lastOpened;
  } else {
    this.lastOpened = null;
  }

  if (typeof options.stared !== 'undefined' && options.stared !== null) {
    this.stared = options.stared;
  } else {
    this.stared = false;
  }
}

Project.prototype.getPaths = function() {
  return this.paths;
}

Project.prototype.getLastOpened = function() {
  return this.lastOpened;
}

Project.prototype.setLastOpened = function(lastOpened) {
  this.lastOpened = lastOpened;
}

Project.prototype.getDevMode = function() {
  return this.devMode;
}

Project.prototype.getStared = function() {
  return this.stared;
}

Project.prototype.setStared = function(stared) {
  this.stared = stared;
}

Project.prototype.getBranch = function() {
  var branch = null;
  try {
    var repo = new GitRepository(this.getPaths()[0]);
    branch = repo.getShortHead();
    repo.destroy();
  } catch (_error) {}
  return branch;
}

Project.prototype.getFtpUrl = function() {
  var uri = path.join(this.getPaths()[0], '.ftpconfig');
  try {
    var configFile = fs.readFileSync(uri, 'utf8');
    var config = JSON.parse(configFile);

    if (config.protocol != 'ftp' && config.protocol != 'sftp' && config.protocol != 'ftps') {
      return;
    }
    var ftpUrl = config.protocol + '://';
    if (config.user) {
      ftpUrl = ftpUrl + config.user + '@';
    }
    if (config.host) {
      ftpUrl = ftpUrl + config.host;
    } else {
      ftpUrl = ftpUrl + 'localhost';
    }
    if (config.port) {
      if ((config.port == '21' && config.protocol != 'ftp' && config.protocol != 'ftps') || (config.port == '22' && config.protocol != 'sftp')) {
        ftpUrl = ftpUrl + ':' + config.port;
      }
    }
    if (config.remote) {
      ftpUrl = ftpUrl + ((config.remote.charAt(0) != '/') ? '/' : '') + config.remote;
    } else {
      ftpUrl = ftpUrl + '/';
    }

    return ftpUrl;
  } catch (_error) {}
}

Project.prototype.getTile = function() {
  var tileUri = null;
  this.getPaths().forEach(function(arg) {
    if (tileUri)
      return;
    var uri = path.join(arg, ".project-tile.png");
    if (fs.existsSync(uri))
      tileUri = uri;
  });
  return tileUri;
}

Project.prototype.mustBeDeleted = function() {
  return this.paths.length == 0;
}

Project.prototype.equals = function(project) {
  if (!project instanceof Project && !project !== atom.project) {
    return false;
  }
  paths1 = this.getPaths().slice(0);
  paths1.sort();

  paths2 = project.getPaths().slice(0);
  paths2.sort();

  if (paths1.length == paths2.length && paths1.every(
      function(v, i) {
        return v === paths2[i];
      }
    )) {
    return true;
  }
  return false;
}

module.exports = Project;
