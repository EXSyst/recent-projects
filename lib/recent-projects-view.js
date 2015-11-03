'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, "next"); var callThrow = step.bind(null, "throw"); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

require("babel-polyfill");

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

var relativeToHomeDirectory = function relativeToHomeDirectory(uri) {
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

var RecentProjectsView;
module.exports = RecentProjectsView = (function (_ScrollView) {
	_inherits(RecentProjectsView, _ScrollView);

	function RecentProjectsView() {
		_classCallCheck(this, RecentProjectsView);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(RecentProjectsView).apply(this, arguments));
	}

	_createClass(RecentProjectsView, [{
		key: 'initialize',
		value: function initialize(arg) {
			this.uri = arg.uri;
			this.selectedEntry = null;

			_get(Object.getPrototypeOf(RecentProjectsView.prototype), 'initialize', this).apply(this, arguments);
			if (atom.project.getPaths().length != 0) {
				this.newFileButton.addClass('hidden');
			}
			this.handleEvents();
			return RecentProjectsManager.get((function (_this) {
				return function (err, projects) {
					if (err != null) {
						return _this.setError(err);
					} else {
						return _this.setList(projects);
					}
				};
			})(this));
		}
	}, {
		key: 'deactivate',
		value: function deactivate() {
			this.subs.dispose();
		}
	}, {
		key: 'handleEvents',
		value: function handleEvents() {
			var _this = this;
			// Instanciate the events listener
			this.subs = new CompositeDisposable();
			this.subs.add(atom.config.observe('recent-projects.openInNewWindow', function (newWindow) {
				_this.newWindow = newWindow;
			}));
			this.subs.add(atom.config.observe('recent-projects.showGitBranch', function (showGitBranch) {
				return _this.projectList.toggleClass('show-git-branch', showGitBranch);
			}));
			this.subs.add(atom.config.observe('recent-projects.showLastOpened', function (showLastOpened) {
				return _this.projectList.toggleClass('show-last-opened', showLastOpened);
			}));
			this.subs.add(atom.config.observe('recent-projects.showExtraPaths', function (showExtraPaths) {
				return _this.projectList.toggleClass('show-extra-paths', showExtraPaths);
			}));
			this.subs.add(atom.config.observe('recent-projects.showFtpUrl', function (showFtpUrl) {
				return _this.projectList.toggleClass('show-ftp-url', showFtpUrl);
			}));
			this.subs.add(atom.config.observe('recent-projects.textOnly', function (textOnly) {
				return _this.projectList.toggleClass('text-only', textOnly);
			}));

			this.subs.add(atom.commands.add(this.element, {
				'core:move-up': this.moveUp.bind(this),
				'core:move-down': this.moveDown.bind(this),
				'recent-projects:move-left': this.moveLeft.bind(this),
				'recent-projects:move-right': this.moveRight.bind(this),
				'recent-projects:open-selected': this.openSelected.bind(this),
				'recent-projects:star-selected': this.starSelected.bind(this),
				'recent-projects:remove-selected': this.removeSelected.bind(this)
			}));
		}
	}, {
		key: 'getRatio',
		value: function getRatio() {
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
	}, {
		key: 'getPosition',
		value: function getPosition(entry) {
			var ratio = this.getRatio();
			var prevs = entry.prevAll();

			var x = prevs.length % ratio;
			var y = Math.ceil((prevs.length + 1) / ratio) - 1;

			return [x, y];
		}
	}, {
		key: 'getLastY',
		value: function getLastY() {
			var ratio = this.getRatio();
			var entries = this.projectList.find('.project-entry');

			var y = Math.ceil(entries.length / ratio);

			return y - 1;
		}
	}, {
		key: 'selectEntry',
		value: function selectEntry(entry) {
			if (entry == null && entry.length > 0) {
				return;
			}

			if (this.selectedEntry) {
				this.selectedEntry.removeClass('selected');
			}
			this.selectedEntry = entry;
			entry.addClass('selected');
		}
	}, {
		key: 'selectPosition',
		value: function selectPosition(x, y, invalidPositionCallback) {
			if (null == invalidPositionCallback) {
				var _this = this;
				invalidPositionCallback = function () {
					var entries = _this.projectList.find('.project-entry');
					_this.selectEntry(entries.last());
				};
			}

			var ratio = this.getRatio();
			if (x === null) {
				x = ratio - 1;
			} else if (x > ratio - 1) {
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
	}, {
		key: 'moveUp',
		value: function moveUp() {
			if (this.selectedEntry != null) {
				var position = this.getPosition(this.selectedEntry);
				var y = position[1] !== 0 ? position[1] - 1 : this.getLastY();
				this.selectPosition(position[0], y);
			} else {
				this.selectPosition(0, 0);
			}
		}
	}, {
		key: 'moveDown',
		value: function moveDown() {
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
	}, {
		key: 'moveLeft',
		value: function moveLeft() {
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
	}, {
		key: 'moveRight',
		value: function moveRight() {
			if (this.selectedEntry != null) {
				var position = this.getPosition(this.selectedEntry);
				var x = position[0] + 1;

				var _this = this;
				this.selectPosition(x, position[1], function () {
					_this.selectPosition(0, 0);
				});
			} else {
				this.selectPosition(0, 0);
			}
		}
	}, {
		key: 'openSelected',
		value: function openSelected() {
			if (this.selectedEntry == null) {
				return;
			}

			this.selectedEntry.click();
		}
	}, {
		key: 'starSelected',
		value: function starSelected() {
			if (this.selectedEntry == null) {
				return;
			}

			this.selectedEntry.find('.project-star').click();
		}
	}, {
		key: 'removeSelected',
		value: function removeSelected() {
			if (this.selectedEntry == null) {
				return;
			}

			this.selectedEntry.find('.project-delete').click();
		}
	}, {
		key: 'copy',
		value: function copy() {
			return new RecentProjectsView({
				uri: this.uri
			});
		}
	}, {
		key: 'getURI',
		value: function getURI() {
			return this.uri;
		}
	}, {
		key: 'getTitle',
		value: function getTitle() {
			return 'Recent Projects';
		}
	}, {
		key: 'getIconName',
		value: function getIconName() {
			return 'repo';
		}
	}, {
		key: 'setError',
		value: function setError(err) {
			if (err) {
				this.errorMessage.text('' + err);
				this.errorMessage.removeClass('hidden');
				return this.projectList.addClass('hidden');
			} else {
				this.errorMessage.addClass('hidden');
				return this.projectList.removeClass('hidden');
			}
		}
	}, {
		key: 'setList',
		value: function setList(projects) {
			var _this = this;
			this.projectList.empty(); // Clean the project list

			return projects.forEach(function (project) {
				if (!Project.equals(project, atom.project)) {
					// If not the current project
					var entry = $$(function () {
						var _this = this;
						return this.li({
							"class": 'project-entry btn btn-default icon icon-repo' + (project.stared ? ' stared' : '')
						}, function () {
							_this.div({
								"class": 'project-meta'
							}, function () {
								_this.div({
									"class": 'project-title'
								}, path.basename(project.paths[0]));
								_this.div({
									"class": 'project-url icon icon-file-directory'
								}, relativeToHomeDirectory(path.dirname(project.paths[0])));
								_this.br();
								if (project.devMode) {
									_this.div({
										"class": 'project-meta-mini project-dev-mode icon icon-color-mode'
									}, 'dev mode');
								}
								var branch = project.branch;
								if (branch != null) {
									_this.div({
										"class": 'project-meta-mini project-branch icon icon-git-branch'
									}, branch);
								}
								if (project.lastOpened) {
									_this.div({
										"class": 'project-meta-mini project-date icon icon-clock'
									}, function () {
										return _this.time({
											datetime: new Date(project.lastOpened).toUTCString()
										}, relativeDate(project.lastOpened));
									});
								}
								if (project.paths.length > 1) {
									_this.div({
										"class": 'project-meta-mini project-extra-paths icon icon-plus'
									}, '+ ' + (project.paths.length - 1) + ' more paths');
								}
								var ftpUrl = project.ftpUrl;
								if (ftpUrl) {
									_this.div({
										"class": 'project-meta-mini project-ftp-url icon icon-link'
									}, ftpUrl);
								}
								return _this;
							});
							_this.button({
								"class": 'project-star btn btn-danger icon icon-star'
							});

							// Add a button to remove this project
							return _this.button({
								"class": 'project-delete btn btn-danger icon icon-x'
							});
						});
					});

					// Set the default tile
					entry.css('background-image', '');
					entry.addClass('icon');
					entry.addClass('icon-repo');

					// Set the customized tile asynchronously
					_asyncToGenerator(regeneratorRuntime.mark(function _callee() {
						var tile;
						return regeneratorRuntime.wrap(function _callee$(_context) {
							while (1) switch (_context.prev = _context.next) {
								case 0:
									_context.next = 2;
									return project.tile;

								case 2:
									tile = _context.sent;

									if (tile) {
										entry.css('background-image', 'url(file://' + tile.split(path.sep).join('/') + ')');
										entry.removeClass('icon');
										entry.removeClass('icon-repo');
									}

								case 4:
								case 'end':
									return _context.stop();
							}
						}, _callee, this);
					}))();

					entry.on('click', _this.openProject.bind(_this, project));
					entry.find('.project-star').on('click', function (ev) {
						ev.stopPropagation();
						return _this.starProject(project, entry);
					});
					entry.find('.project-delete').on('click', function (ev) {
						ev.stopPropagation();
						return _this.removeProject(project, entry);
					});
					return _this.projectList.append(entry);
				}
			});
		}
	}, {
		key: 'starProject',
		value: function starProject(project, entry) {
			var stared = !project.stared;
			project.stared = stared;
			return RecentProjectsManager.update(project, function (err) {
				if (err == null) {
					if (stared) {
						entry.addClass('stared');
					} else {
						entry.removeClass('stared');
					}
				}
			});
		}
	}, {
		key: 'removeProject',
		value: function removeProject(project, entry) {
			var _this = this;
			return RecentProjectsManager.remove(project, function (err) {
				if (err == null) {
					_this.moveRight();
					if (entry == _this.selectedEntry) {
						_this.selectedEntry = null;
					}
					return entry.remove();
				}
			});
		}
	}, {
		key: 'openProject',
		value: function openProject(project) {
			atom.open({
				pathsToOpen: project.paths,
				newWindow: this.newWindow,
				devMode: project.devMode
			});
			if (!this.newWindow) {
				return this.closeAfterOpenProject();
			}
		}
	}, {
		key: 'openFolder',
		value: function openFolder() {
			if (remote == null) {
				remote = require('remote');
			}
			if (dialog == null) {
				dialog = remote.require('dialog');
			}
			var _this = this;
			return dialog.showOpenDialog({
				title: 'Open',
				properties: ['openDirectory', 'multiSelections', 'createDirectory']
			}, function (paths) {
				if (paths != null) {
					var project = new Project({
						paths: paths
					});
					return _this.openProject(project);
				}
			});
		}
	}, {
		key: 'createNewFile',
		value: function createNewFile() {
			var dispatch = atom.commands.dispatch(atom.views.getView(atom.workspace), 'application:new-file');
			atom.workspace.getActivePane().removeItem(this);
			return dispatch;
		}
	}, {
		key: 'closeAfterOpenProject',
		value: function closeAfterOpenProject() {
			var showTree;
			if (atom.project.getPaths().length > 0 || atom.workspace.getActivePane().getItems().length > 1 || parseFloat(atom.getVersion()) >= 0.124) {
				atom.workspace.getActivePane().removeItem(this);
				showTree = function () {
					return atom.commands.dispatch(atom.views.getView(atom.workspace), "tree-view:show");
				};
				return setTimeout(showTree, 0);
			} else {
				return atom.close();
			}
		}
	}], [{
		key: 'content',
		value: function content() {
			var _this = this;
			return this.div({
				"class": 'recent-projects-view pane-item padded',
				tabindex: '0'
			}, function () {
				_this.div({
					"class": 'actions-bar'
				}, function () {
					_this.button({
						"class": 'btn btn-default icon icon-file-directory',
						outlet: 'openFolderButton',
						click: 'openFolder'
					}, 'Open Folder...');
					return _this.button({
						"class": 'btn btn-default icon icon-file-code',
						outlet: 'newFileButton',
						click: 'createNewFile'
					}, 'New File');
				});
				_this.div({
					"class": 'alert alert-danger hidden',
					outlet: 'errorMessage'
				});
				return _this.ul({
					"class": 'project-list',
					outlet: 'projectList'
				});
			});
		}
	}]);

	return RecentProjectsView;
})(ScrollView);
