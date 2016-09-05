'use babel';

import AtomProjectUtil from 'atom-project-util'

var atomRef = require('atom'),
	viewRef = require('atom-space-pen-views'),
	CompositeDisposable = atomRef.CompositeDisposable,
	GitRepository = atomRef.GitRepository,
	ScrollView = viewRef.ScrollView,
	$ = viewRef.$,
	$$ = viewRef.$$;
var path = require('path');
var relativeDate = require('relative-date');

var RecentProjectsManager = require('./recent-projects-manager');
var Project = require('./project');
var remote = null;
var dialog = null;

var homeDirectory = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
if (homeDirectory != null) {
	homeDirectory = path.resolve(homeDirectory);
}

var relativeToHomeDirectory = function(uri) {
	if (homeDirectory == null) {
		return uri;
	}
	uri = path.resolve(uri);
	if (uri === homeDirectory) {
		return "~";
	} else if (uri.length > homeDirectory.length && uri.substring(0, homeDirectory.length + 1) === homeDirectory + path.sep) {
		return "~" + uri.substring(homeDirectory.length);
	} else {
		return uri;
	}
};

module.exports = class RecentProjectsView extends ScrollView {
	static content() {
		var _this = this;
		return this.div({
			"class": 'recent-projects-view pane-item',
			tabindex: '0'
		}, function() {
			_this.div({
				"class": 'actions-bar'
			}, async function() {
				_this.button({
					"class": 'btn btn-default icon icon-file-directory',
					outlet: 'openFolderButton',
					click: 'openFolder'
				}, 'Open Folder...');
				_this.button({
					"class": 'btn btn-default icon icon-file-code',
					outlet: 'newFileButton',
					click: 'createNewFile'
				}, 'New File');
			});
			_this.h1('Recent Projects');
			_this.div({
				"class": 'alert alert-danger hidden',
				outlet: 'errorMessage'
			});
			_this.ul({
				"class": 'project-list',
				outlet: 'projectList'
			});
		});
	}

	async initialize(arg) {
		this.uri = arg.uri;
		this.selectedEntry = null;

		super.initialize.apply(this, arguments);
		if (atom.project.getPaths().length != 0) {
			this.newFileButton.addClass('hidden');
		}
		this.handleEvents();

		return RecentProjectsManager.get((function(_this) {
			return function(err, projects) {
				if (err != null) {
					_this.setError(err);
				} else {
					_this.setList(projects);
				}
			};
		})(this));
	}

	deactivate() {
		this.subs.dispose();
	}

	async handleEvents() {
		var _this = this;
		// Instanciate the events listener
		this.subs = new CompositeDisposable;
		this.subs.add(atom.config.observe('recent-projects.openInNewWindow', function(newWindow) {
			_this.newWindow = newWindow;
		}));
		this.subs.add(atom.config.observe('recent-projects.showGitBranch', function(showGitBranch) {
			return _this.projectList.toggleClass('show-git-branch', showGitBranch);
		}));
		this.subs.add(atom.config.observe('recent-projects.showLastOpened', function(showLastOpened) {
			return _this.projectList.toggleClass('show-last-opened', showLastOpened);
		}));
		this.subs.add(atom.config.observe('recent-projects.showExtraPaths', function(showExtraPaths) {
			return _this.projectList.toggleClass('show-extra-paths', showExtraPaths);
		}));
		this.subs.add(atom.config.observe('recent-projects.showFtpUrl', function(showFtpUrl) {
			return _this.projectList.toggleClass('show-ftp-url', showFtpUrl);
		}));
		this.subs.add(atom.config.observe('recent-projects.textOnly', function(textOnly) {
			return _this.projectList.toggleClass('text-only', textOnly);
		}));

		this.subs.add(atom.commands.add(this.element, {
			'core:move-up': this.moveUp.bind(this),
			'core:move-down': this.moveDown.bind(this),
			'recent-projects:move-left': this.moveLeft.bind(this),
			'recent-projects:move-right': this.moveRight.bind(this),
			'recent-projects:open-selected': this.openSelected.bind(this),
			'recent-projects:star-selected': this.starSelected.bind(this),
			'recent-projects:remove-selected': this.removeSelected.bind(this),
		}));
	}

	getRatio() {
		var ref;
		var first = (ref = this.projectList.find('.project-entry').first()) != null ? ref : null;
		if (first == null) {
			return;
		}

		var containerWidth = this.projectList.outerWidth();
		var tileWidth = first.outerWidth();
		var ratio = Math.floor(containerWidth / tileWidth);

		return ratio;
	}

	getPosition(entry) {
		var ratio = this.getRatio();
		var prevs = entry.prevAll();

		var x = prevs.length % ratio;
		var y = Math.ceil((prevs.length + 1) / ratio) - 1;

		return [x, y];
	}

	getLastY() {
		var ratio = this.getRatio();
		var entries = this.projectList.find('.project-entry');

		var y = Math.ceil(entries.length / ratio);

		return y - 1;
	}

	async selectEntry(entry) {
		if (entry == null && entry.length > 0) {
			return;
		}

		if (this.selectedEntry) {
			this.selectedEntry.removeClass('selected');
		}
		this.selectedEntry = entry;
		entry.addClass('selected');
	}

	selectPosition(x, y, invalidPositionCallback) {
		if (null == invalidPositionCallback) {
			var _this = this;
			invalidPositionCallback = function() {
				var entries = _this.projectList.find('.project-entry');
				_this.selectEntry(entries.last());
			}
		}

		var ratio = this.getRatio();
		if (x === null) {
			x = ratio - 1;
		} else if (x > (ratio - 1)) {
			y += Math.floor(x / ratio);
			x = x % ratio;
		}

		var index = y * ratio + x;

		var entries = this.projectList.find('.project-entry');
		if (y < 0 || entries.length <= index) {
			invalidPositionCallback();
		} else {
			this.selectEntry($(entries[index]));
		}
	}

	moveUp() {
		if (this.selectedEntry != null) {
			var position = this.getPosition(this.selectedEntry);
			var y = position[1] !== 0 ? position[1] - 1 : this.getLastY();
			this.selectPosition(position[0], y);
		} else {
			this.selectPosition(0, 0);
		}
	}

	moveDown() {
		if (this.selectedEntry != null) {
			var position = this.getPosition(this.selectedEntry);
			var y = position[1] + 1;
			if (y > this.getLastY()) {
				y = 0;
			}
			this.selectPosition(position[0], y);
		} else {
			this.selectPosition(0, 0);
		}
	}

	moveLeft() {
		if (this.selectedEntry != null) {
			var position = this.getPosition(this.selectedEntry);
			var x = position[0] - 1;
			var y = position[1];
			if (x < 0) {
				x = null;
				y -= 1;
			}

			this.selectPosition(x, y);
		} else {
			this.selectPosition(0, 0);
		}
	}

	moveRight() {
		if (this.selectedEntry != null) {
			var position = this.getPosition(this.selectedEntry);
			var x = position[0] + 1;

			var _this = this;
			this.selectPosition(x, position[1], function() {
				_this.selectPosition(0, 0);
			});
		} else {
			this.selectPosition(0, 0);
		}
	}

	async openSelected() {
		if (this.selectedEntry == null) {
			return;
		}

		this.selectedEntry.click();
	}

	async starSelected() {
		if (this.selectedEntry == null) {
			return;
		}

		this.selectedEntry.find('.project-star').click();
	}

	async originSelected() {
		if (this.selectedEntry == null) {
			return;
		}

		this.selectedEntry.find('.project-origin').click();
	}

	async removeSelected() {
		if (this.selectedEntry == null) {
			return;
		}

		this.selectedEntry.find('.project-delete').click();
	}

	copy() {
		return new RecentProjectsView({
			uri: this.uri
		});
	}

	getURI() {
		return this.uri;
	}

	getTitle() {
		return 'Recent Projects';
	}

	getIconName() {
		return 'repo';
	}

	async setError(err) {
		if (err) {
			this.errorMessage.text('' + err);
			this.errorMessage.removeClass('hidden');

			return this.projectList.addClass('hidden');
		} else {
			this.errorMessage.addClass('hidden');

			return this.projectList.removeClass('hidden');
		}
	}

	setList(projects) {
		var _this = this;
		this.projectList.empty(); // Clean the project list

		projects.forEach(async function (project) {
			// If not the current project
			if (!Project.equals(project, atom.project)) {
				var entry = await $$(function() {
					var _this = this;
					return this.li({
						class: 'project-entry btn btn-default icon icon-repo' + (project.stared ? ' stared' : '')
					}, async function() {
						_this.div({
							class: 'project-meta'
						}, function() {
							_this.div({
								class: 'project-title'
							}, path.basename(project.paths[0]));
							_this.div({
								class: 'project-url icon icon-file-directory'
							}, relativeToHomeDirectory(path.dirname(project.paths[0])));
							_this.br();
							if (project.devMode) {
								_this.div({
									class: 'project-meta-mini project-dev-mode icon icon-color-mode'
								}, 'dev mode');
							}
							var branch = project.branch;
							if (branch != null) {
								_this.div({
									class: 'project-meta-mini project-branch icon icon-git-branch'
								}, branch);
							}
							if (project.lastOpened) {
								_this.div({
									class: 'project-meta-mini project-date icon icon-clock'
								}, function () {
									return _this.time({
										datetime: new Date(project.lastOpened).toUTCString()
									}, relativeDate(project.lastOpened));
								});
							}
							if (project.paths.length > 1) {
								_this.div({
									class: 'project-meta-mini project-extra-paths icon icon-plus'
								}, '+ ' + (project.paths.length - 1) + ' more paths');
							}
							var ftpUrl = project.ftpUrl;
							if (ftpUrl) {
								_this.div({
									class: 'project-meta-mini project-ftp-url icon icon-link'
								}, ftpUrl);
							}
						});
						_this.button({
							class: 'project-star btn btn-secondary icon icon-star'
						});


						if (project.origin) {
							_this.button({
								class: 'project-origin btn btn-secondary icon icon-mark-github'
							});
						}

						// Add a button to remove this project
						return _this.button({
							class: 'project-delete btn btn-danger icon icon-x'
						});
					});
				});

				// Set the default tile
				await entry.css('background-image', '');
				await entry.addClass('icon');
				await entry.addClass('icon-repo');

				let tile = await project.tile;
				if (tile) {
					entry.css('background-image', 'url(file://' + encodeURI(tile.split(path.sep).join('/')) + ')');
					entry.removeClass('icon');
					entry.removeClass('icon-repo');
				}

				entry.on('click', _this.openProject.bind(_this, project));
				entry.find('.project-star').on('click', function(ev) {
					ev.stopPropagation();
					return _this.starProject(project, entry);
				});
				entry.find('.project-origin').on('click', function(ev) {
					ev.stopPropagation();
					return _this.openOrigin(project, entry);
				});
				entry.find('.project-delete').on('click', function(ev) {
					ev.stopPropagation();
					return _this.removeProject(project, entry);
				});
				await _this.projectList.append(entry);
			}
		});
	}

	starProject(project, entry) {
		var stared = !project.stared;
		project.stared = stared;

		return RecentProjectsManager.update(project, function(err) {
			if (err == null) {
				if (stared) {
					entry.addClass('stared');
				} else {
					entry.removeClass('stared');
				}
			}
		});
	}

	openOrigin(project, entry) {
		var shell = require('shell');
		shell.openExternal(project.origin);
	}

	removeProject(project, entry) {
		var _this = this;
		return RecentProjectsManager.remove(project, function(err) {
			if (err == null) {
				_this.moveRight();
				if (entry == _this.selectedEntry) {
					_this.selectedEntry = null;
				}
				return entry.remove();
			}
		});
	}

	openProject(project) {
		if (this.newWindow || project.devMode != atom.inDevMode()) {
			atom.open({
				pathsToOpen: project.paths,
				newWindow: true,
				devMode: project.devMode
			});
			this.closeAfterOpenProject();
		} else {
			AtomProjectUtil.switch(project.paths)
				.then(() => {
					this.closeAfterOpenProject();
				})
				.catch(err => {
					throw err;
				})
			;
		}
	}

	openFolder() {
		if (remote == null) {
			remote = require('remote');
		}
		if (dialog == null) {
			dialog = remote.require('dialog');
		}

		var _this = this;
		dialog.showOpenDialog({
			title: 'Open',
			properties: ['openDirectory', 'multiSelections', 'createDirectory']
		}, function (paths) {
			if (paths != null) {
				_this.openProject(new Project({
					paths: paths
				}));
			}
		});
	}

	createNewFile() {
		atom.commands.dispatch(atom.views.getView(atom.workspace), 'application:new-file');
		atom.workspace.getActivePane().removeItem(this);
	}

	closeAfterOpenProject() {
		if ((atom.project.getPaths().length > 0) || atom.workspace.getActivePane().getItems().length > 1) {
			atom.workspace.getActivePane().removeItem(this);
			atom.commands.dispatch(atom.views.getView(atom.workspace), "tree-view:show");
		} else {
			return atom.close();
		}
	}
}
