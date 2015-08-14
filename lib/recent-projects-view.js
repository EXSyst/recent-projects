var extend = function(child, parent) {
    for (var key in parent) {
        if (hasProp.call(parent, key))
            child[key] = parent[key];
    }

    function ctor() {
        this.constructor = child;
    }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    child.__super__ = parent.prototype;
    return child;
};

var hasProp = {}.hasOwnProperty;

var atomRef = require('atom'),
    viewRef = require('atom-space-pen-views'),
    CompositeDisposable = atomRef.CompositeDisposable,
    GitRepository = atomRef.GitRepository,
    ScrollView = viewRef.ScrollView,
    $ = viewRef.$,
    $$ = viewRef.$$;
var path = require('path');
var relativeDate = require('relative-date');

var RecentProjectsView;
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

module.exports = RecentProjectsView = (function(superClass) {
    extend(RecentProjectsView, superClass);

    function RecentProjectsView() {
        return RecentProjectsView.__super__.constructor.apply(this, arguments);
    }

    RecentProjectsView.content = function() {
        var _this = this;
        return this.div({
            "class": 'recent-projects-view pane-item padded',
            tabindex: '0'
        }, function() {
            _this.div({
                "class": 'actions-bar'
            }, function() {
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
    };

    /**
     * Initialize this view
     *
     * @param Array arg
     */
    RecentProjectsView.prototype.initialize = function(arg) {
        this.uri = arg.uri;
        this.selectedEntry = null;

        RecentProjectsView.__super__.initialize.apply(this, arguments);
        if (atom.project.getPaths().length != 0) {
            this.newFileButton.addClass('hidden');
        }
        this.handleEvents();
        return RecentProjectsManager.get((function(_this) {
            return function(err, projects) {
                if (err != null) {
                    return _this.setError(err);
                } else {
                    return _this.setList(projects);
                }
            };
        })(this));
    };

    /**
     * Deactivate this view
     */
    RecentProjectsView.prototype.deactivate = function() {
        this.subs.dispose();
    };

    /**
     * Handle this view events
     */
    RecentProjectsView.prototype.handleEvents = function() {
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
            'recent-projects:remove-selected': this.removeSelected.bind(this),
        }));
    }

    /**
     * Calc tiles ratio
     */
    RecentProjectsView.prototype.getRatio = function() {
        var first = (ref = this.projectList.find('.project-entry').first()) != null ? ref : null;
        if (first == null) {
            return;
        }

        var containerWidth = this.projectList.outerWidth();
        var tileWidth = first.outerWidth();
        var ratio = Math.floor(containerWidth / tileWidth);
        return ratio;
    };

    /**
     * Calc tiles ratio
     */
    RecentProjectsView.prototype.getPosition = function(entry) {
        var ratio = this.getRatio();
        var prevs = entry.prevAll();

        var x = prevs.length % ratio;
        var y = Math.ceil((prevs.length + 1) / ratio) - 1;

        return [x, y];
    };

    /**
     * Get the last y position
     */
    RecentProjectsView.prototype.getLastY = function() {
        var ratio = this.getRatio();
        var entries = this.projectList.find('.project-entry');

        var y = Math.ceil(entries.length / ratio);

        return y - 1;
    };

    /**
     * Select a project entry
     */
    RecentProjectsView.prototype.selectEntry = function(entry) {
        if (entry == null && entry.length > 0) {
            return;
        }

        if (this.selectedEntry) {
            this.selectedEntry.removeClass('selected');
        }
        this.selectedEntry = entry;
        entry.addClass('selected');
    };

    /**
     * Select an entry from its position
     */
    RecentProjectsView.prototype.selectPosition = function(x, y, invalidPositionCallback) {
        if(null == invalidPositionCallback) {
            var _this = this;
            invalidPositionCallback = function () {
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
    };

    /**
     * Move up
     */
    RecentProjectsView.prototype.moveUp = function() {
        if (this.selectedEntry != null) {
            var position = this.getPosition(this.selectedEntry);
            var y = position[1] !== 0 ? position[1] - 1 : this.getLastY();
            this.selectPosition(position[0], y);
        } else {
            this.selectPosition(0, 0);
        }
    };

    /**
     * Move down
     */
    RecentProjectsView.prototype.moveDown = function() {
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
    };

    /**
     * Move left
     */
    RecentProjectsView.prototype.moveLeft = function() {
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
    };

    /**
     * Move right
     */
    RecentProjectsView.prototype.moveRight = function() {
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
    };

    /**
     * Open the selected project
     */
    RecentProjectsView.prototype.openSelected = function() {
        if (this.selectedEntry == null) {
            return;
        }

        this.selectedEntry.click();
    };

    /**
     * Open the selected project
     */
    RecentProjectsView.prototype.removeSelected = function() {
        if (this.selectedEntry == null) {
            return;
        }

        $(this.selectedEntry).find('.project-delete').click();
    };

    /**
     * Copy this view
     *
     * @return RecentProjectsView
     */
    RecentProjectsView.prototype.copy = function() {
        return new RecentProjectsView({
            uri: this.uri
        });
    };

    /**
     * Get the uri of this view
     *
     * @return String
     */
    RecentProjectsView.prototype.getURI = function() {
        return this.uri;
    };

    /**
     * Get the title of this view
     *
     * @return String
     */
    RecentProjectsView.prototype.getTitle = function() {
        return 'Recent Projects';
    };

    /**
     * Get the icon of this view
     *
     * @return String
     */
    RecentProjectsView.prototype.getIconName = function() {
        return 'repo';
    };

    /**
     * Set an error
     *
     * @param String err
     */
    RecentProjectsView.prototype.setError = function(err) {
        if (err) {
            this.errorMessage.text('' + err);
            this.errorMessage.removeClass('hidden');
            return this.projectList.addClass('hidden');
        } else {
            this.errorMessage.addClass('hidden');
            return this.projectList.removeClass('hidden');
        }
    };

    /**
     * Set the projects to display
     *
     * @param Array projects
     */
    RecentProjectsView.prototype.setList = function(projects) {
        var _this = this;
        this.projectList.empty(); // Clean the project list
        projects.forEach(function(project) {
            if (!project.equals(atom.project)) { // If not the current project
                var entry = $$(function() {
                    var _this = this;
                    return this.li({
                        "class": 'project-entry btn btn-default icon icon-repo'
                    }, function() {
                        _this.div({
                            "class": 'project-meta'
                        }, function() {
                            _this.div({
                                "class": 'project-title'
                            }, path.basename(project.getPaths()[0]));
                            _this.div({
                                "class": 'project-url icon icon-file-directory'
                            }, relativeToHomeDirectory(path.dirname(project.getPaths()[0])));
                            _this.br();
                            if (project.getDevMode()) {
                                _this.div({
                                    "class": 'project-meta-mini project-dev-mode icon icon-color-mode'
                                }, 'dev mode');
                            }
                            var branch = project.getBranch();
                            if (branch != null) {
                                _this.div({
                                    "class": 'project-meta-mini project-branch icon icon-git-branch'
                                }, branch);
                            }
                            if (project.getLastOpened()) {
                                _this.div({
                                    "class": 'project-meta-mini project-date icon icon-clock'
                                }, function() {
                                    return _this.time({
                                        datetime: new Date(project.getLastOpened()).toUTCString()
                                    }, relativeDate(project.getLastOpened()));
                                });
                            }
                            if (project.getPaths().length > 1) {
                                _this.div({
                                    "class": 'project-meta-mini project-extra-paths icon icon-plus'
                                }, '+ ' + (project.getPaths().length - 1) + ' more paths');
                            }
                            var ftpUrl = project.getFtpUrl();
                            if (ftpUrl) {
                                _this.div({
                                    "class": 'project-meta-mini project-ftp-url icon icon-link'
                                }, ftpUrl);
                            }
                            return _this;
                        });
                        // _this.button({
                        //     "class": 'project-star btn btn-danger icon icon-star'
                        // });

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
                setTimeout(function() {
                    var tile = project.getTile();
                    if (tile) {
                        entry.css('background-image', 'url(file://' + tile.split(path.sep).join('/') + ')');
                        entry.removeClass('icon');
                        entry.removeClass('icon-repo');
                    }
                }, 0);

                entry.on('click', _this.openProject.bind(_this, project));
                entry.find('.project-delete').on('click', function(ev) {
                    ev.stopPropagation();
                    return _this.removeProject(project, entry);
                });
                return _this.projectList.append(entry);
            }
        });

        // Fix flexbox
        var entry = $$(function() {
            return this.li();
        });
        _this.projectList.append(entry);

        var entry2 = $$(function() {
            return this.li();
        });
        return _this.projectList.append(entry2);
    };

    /**
     * Remove a project
     *
     * @param Project project
     * @param Object entry
     */
    RecentProjectsView.prototype.removeProject = function(project, entry) {
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
    };

    /**
     * Open a project
     *
     * @param Project project
     */
    RecentProjectsView.prototype.openProject = function(project) {
        var devMode;
        atom.open({
            pathsToOpen: project.getPaths(),
            newWindow: this.newWindow,
            devMode: project.getDevMode()
        });
        if (!this.newWindow) {
            return this.closeAfterOpenProject();
        }
    };

    /**
     * Open a folder
     *
     * @return RecentProjectsView
     */
    RecentProjectsView.prototype.openFolder = function() {
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
        }, function(paths) {
            if (paths != null) {
                var project = new Project({
                    paths: paths
                });
                return _this.openProject(project);
            }
        });
    };

    /**
     * Open a dialog to create a new file
     */
    RecentProjectsView.prototype.createNewFile = function() {
        var dispath = atom.commands.dispatch(atom.views.getView(atom.workspace), 'application:new-file');
        atom.workspace.getActivePane().removeItem(this);
        return dispatch;
    };

    /**
     * Close after opening a project
     */
    RecentProjectsView.prototype.closeAfterOpenProject = function() {
        var showTree;
        if ((atom.project.getPaths().length > 0) || atom.workspace.getActivePane().getItems().length > 1 || parseFloat(atom.getVersion()) >= 0.124) {
            atom.workspace.getActivePane().removeItem(this);
            showTree = function() {
                return atom.commands.dispatch(atom.views.getView(atom.workspace), "tree-view:show");
            };
            return setTimeout(showTree, 0);
        } else {
            return atom.close();
        }
    };

    return RecentProjectsView;

})(ScrollView);
