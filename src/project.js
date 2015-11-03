var path = require('path');
var fs = require('fs');
var GitRepository = require('atom').GitRepository;

module.exports = class Project {
	constructor(options) {
		if (typeof options.paths === 'undefined' || !Array.isArray(options.paths)) {
			throw new Error('"paths" option must be an array.');
		}
		this.paths = options.paths;

		this.devMode = typeof options.devMode !== 'undefined' ? options.devMode : false;
		this.lastOpened = typeof options.lastOpened !== 'undefined' ? options.lastOpened : null;
		this.stared = typeof options.stared !== 'undefined' ? options.stared : false;
	}

	get branch() {
		var branch;
		try {
			var repo = new GitRepository(this.paths[0]);
			branch = repo.getShortHead();
			repo.destroy();
		} catch (_error) {};

		return branch;
	}

	get ftpUri() {
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
				if ((config.port == '21' && config.protocol != 'ftp' && config.protocol != 'ftps') || (config.port == '22' && config.protocol != 'sftp')) {
					ftpUrl = ftpUrl + ':' + config.port;
				}
			}
			if (config.remote)
				ftpUrl = ftpUrl + ((config.remote.charAt(0) != '/') ? '/' : '') + config.remote;
			else
				ftpUrl = ftpUrl + '/';

			return ftpUrl;
		} catch (_error) {}
	}

	get tile() {
		var tileUri;
		for (let uri of this.paths) {
			tileUri = path.join(uri, ".project-tile.png");

			if (fs.existsSync(tileUri))
				return tileUri;
		}
	}

	/**
	 * Prefer Project.paths.
	 */
	getPaths() {
		return this.paths;
	}

	mustBeDeleted() {
		return this.paths.length == 0;
	}

	static equals(project1, project2) {
		var paths1 = project1.getPaths().slice(0); // clone
		paths1.sort();

		var paths2 = project2.getPaths().slice(0); // clone
		paths2.sort();

		if (paths1.length == paths2.length && paths1.every(
				function(v, i) {
					return v === paths2[i];
				}
			))
			return true;

		return false;
	}
}
