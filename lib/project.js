'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var path = require('path');
var fs = require('fs');
var GitRepository = require('atom').GitRepository;

module.exports = (function () {
	function Project(options) {
		_classCallCheck(this, Project);

		if (typeof options.paths === 'undefined' || !Array.isArray(options.paths)) {
			throw new Error('"paths" option must be an array.');
		}
		this.paths = options.paths;

		this.devMode = typeof options.devMode !== 'undefined' ? options.devMode : false;
		this.lastOpened = typeof options.lastOpened !== 'undefined' ? options.lastOpened : null;
		this.stared = typeof options.stared !== 'undefined' ? options.stared : false;
	}

	_createClass(Project, [{
		key: 'getPaths',

		/**
   * Prefer Project.paths.
   */
		value: function getPaths() {
			return this.paths;
		}
	}, {
		key: 'mustBeDeleted',
		value: function mustBeDeleted() {
			return this.paths.length == 0;
		}
	}, {
		key: 'branch',
		get: function get() {
			var branch;
			try {
				var repo = new GitRepository(this.paths[0]);
				branch = repo.getShortHead();
				repo.destroy();
			} catch (_error) {};

			return branch;
		}
	}, {
		key: 'origin',
		get: function get() {
			var origin;
			try {
				var repo = new GitRepository(this.paths[0]);
				
				origin = repo.getOriginURL();
			    if (origin.match(/git@[^:]+:/)) { // e.g., git@github.com:foo/bar.git
					origin = origin.replace(/^git@([^:]+):(.+)$/, 'http://$1/$2');
				} else if (origin.match(/ssh:\/\/git@([^\/]+)\//)) { // e.g., ssh://git@github.com/foo/bar.git
					origin = 'http://' + origin.substring(10);
				} else if (origin.match(/^git:\/\/[^\/]+\//)) { // e.g., git://github.com/foo/bar.git
					origin = 'http' + origin.substring(3);
				}

				repo.destroy();
			} catch (_error) {};

			return origin;
		}
	}, {
		key: 'ftpUri',
		get: function get() {
			var uri = path.join(this.paths[0], '.ftpconfig');
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
					if (config.port == '21' && config.protocol != 'ftp' && config.protocol != 'ftps' || config.port == '22' && config.protocol != 'sftp') {
						ftpUrl = ftpUrl + ':' + config.port;
					}
				}
				if (config.remote) ftpUrl = ftpUrl + (config.remote.charAt(0) != '/' ? '/' : '') + config.remote;else ftpUrl = ftpUrl + '/';

				return ftpUrl;
			} catch (_error) {}
		}
	}, {
		key: 'tile',
		get: function get() {
			var tileUri;
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = this.paths[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var uri = _step.value;

					tileUri = path.join(uri, ".project-tile.png");

					if (fs.existsSync(tileUri)) return tileUri;
				}
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator.return) {
						_iterator.return();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}
		}
	}], [{
		key: 'equals',
		value: function equals(project1, project2) {
			var paths1 = project1.getPaths().slice(0); // clone
			paths1.sort();

			var paths2 = project2.getPaths().slice(0); // clone
			paths2.sort();

			if (paths1.length == paths2.length && paths1.every(function (v, i) {
				return v === paths2[i];
			})) return true;

			return false;
		}
	}]);

	return Project;
})();
