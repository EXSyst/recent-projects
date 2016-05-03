'use babel';

var MAX_RECENT_PROJECTS = 20;

var Project = require('./project');
var path = require("path");
var fs = require("fs");
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
		var data = JSON.parse(stateString);
	} catch (_error) {
		var errorMessage = "Error parsing recent projects file: " + storagePath;
		console.warn(errorMessage, _error.stack, _error);
		return callback(errorMessage);
	}
	var projects = [];
	data.forEach(function(row) {
		var project = new Project(row);
		if (!project.mustBeDeleted()) {
			projects.push(project);
		}
	});
	return callback(null, projects);
};

var write = function(data, callback) {
	try {
		fs.writeFileSync(storagePath, JSON.stringify(data), 'utf8');
	} catch (_error) {
		var errorMessage = "Error writing recent projects file: " + storagePath;
		console.warn(errorMessage, _error.stack, _error);
		if (callback != null) {
			return callback(errorMessage);
		}
	}
	if (callback != null) {
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

var compareProject = function(project) {
	return Project.equals(this, project);
};

var sortProjects = function(projects) {
	projects.sort(function(a, b) {
		if (a.stared && !b.stared) {
			return -1;
		} else if (!a.stared && b.stared) {
			return 1;
		} else if (a.lastOpened > b.lastOpened) {
			return -1;
		} else if (a.lastOpened < b.lastOpened) {
			return 1;
		} else {
			return 0;
		}
	});
}

module.exports = {
	add: function(project, callback) {
		if (!project instanceof Project) {
			throw new Error('You must provide a Project object to RecentProjectsManager::add().');
		}
		var fn = function(data) {
			data.forEach(function(row, i) {
				if (row.mustBeDeleted()) {
					data.splice(i, 1);
				}
			});
			var pos = data.findIndex(compareProject, project);
			if (pos >= 0) {
				data.splice(pos, 1);
			}
			data.unshift(project);
			sortProjects(data);
			return data.splice(MAX_RECENT_PROJECTS);
		};
		return alter(fn, callback);
	},
	update: function(project, callback) {
		if (!project instanceof Project) {
			throw new Error('You must provide a Project object to RecentProjectsManager::update().');
		}
		var fn = function(data) {
			data.forEach(function(row, i) {
				if (row.mustBeDeleted()) {
					data.splice(i, 1);
				}
			});
			var pos = data.findIndex(compareProject, project);
			if (pos >= 0) {
				data[pos] = project;
			}
			sortProjects(data);
			return data.splice(MAX_RECENT_PROJECTS);
		};
		return alter(fn, callback);
	},
	remove: function(project, callback) {
		if (!project instanceof Project) {
			throw new Error('You must provide a Project object to RecentProjectsManager::remove().');
		}
		var fn = function(data) {
			var pos = data.findIndex(compareProject, project);
			if (pos >= 0) {
				return data.splice(pos, 1);
			}
		};
		return alter(fn, callback);
	},
	get: function(callback) {
		return read(callback);
	},
	getCurrentProject: function() {
		return read(function(err, projects) {
			if (err !== null) {
				return false;
			}

			var pos = projects.findIndex(compareProject, atom.project);
			if (pos >= 0) {
				return projects[pos];
			}
			return null;
		});
	},
	clear: function(callback) {
		return unlink(callback);
	}
};
