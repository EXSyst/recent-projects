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

var ref = require('atom'),
    CompositeDisposable = ref.CompositeDisposable,
    GitRepository = ref.GitRepository,
    ScrollView = require('atom-space-pen-views').ScrollView,
    $$ = require('atom-space-pen-views').$$;
var path = require('path');
var relativeDate = require('relative-date');

var RecentProjectsView;
var RecentProjectsManager = null;
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
        return this.div({
            "class": 'pane-item padded recent-projects-view'
        }, (function(_this) {
            return function() {
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
            };
        })(this));
    };

    RecentProjectsView.prototype.initialize = function(arg) {
        this.uri = arg.uri;
        RecentProjectsView.__super__.initialize.apply(this, arguments);
        this.subs = new CompositeDisposable;
        this.subs.add(atom.config.observe('recent-projects.openInNewWindow', (function(_this) {
            return function(newWindow) {
                _this.newWindow = newWindow;
            };
        })(this)));
        this.subs.add(atom.config.observe('recent-projects.showGitBranch', (function(_this) {
            return function(showGitBranch) {
                return _this.projectList.toggleClass('show-git-branch', showGitBranch);
            };
        })(this)));
        this.subs.add(atom.config.observe('recent-projects.showLastOpened', (function(_this) {
            return function(showLastOpened) {
                return _this.projectList.toggleClass('show-last-opened', showLastOpened);
            };
        })(this)));
        this.subs.add(atom.config.observe('recent-projects.showExtraPaths', (function(_this) {
            return function(showExtraPaths) {
                return _this.projectList.toggleClass('show-extra-paths', showExtraPaths);
            };
        })(this)));
        this.subs.add(atom.config.observe('recent-projects.showFtpUrl', (function(_this) {
            return function(showFtpUrl) {
                return _this.projectList.toggleClass('show-ftp-url', showFtpUrl);
            };
        })(this)));
        this.subs.add(atom.config.observe('recent-projects.textOnly', (function(_this) {
            return function(textOnly) {
                return _this.projectList.toggleClass('text-only', textOnly);
            };
        })(this)));
        if (atom.project.getPaths().length != 0) {
            this.newFileButton.addClass('hidden');
        }
        if (RecentProjectsManager == null) {
            RecentProjectsManager = require('./recent-projects-manager');
        }
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

    RecentProjectsView.prototype.copy = function() {
        return new RecentProjectsView({
            uri: this.uri
        });
    };

    RecentProjectsView.prototype.getURI = function() {
        return this.uri;
    };

    RecentProjectsView.prototype.getTitle = function() {
        return 'Recent Projects';
    };

    RecentProjectsView.prototype.getIconName = function() {
        return 'repo';
    };

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

    RecentProjectsView.prototype.setList = function(projects) {
        this.projectList.empty();
        return projects.forEach((function(_this) {
            return function(project) {
                if (!project.equals(atom.project)) {
                    entry = $$(function() {
                        return this.li({
                            "class": 'project-entry btn btn-default icon icon-repo'
                        }, (function(_this) {
                            return function() {
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
                                return _this.button({
                                    "class": 'project-delete btn btn-danger icon icon-x'
                                });
                            };
                        })(this));
                    });

                    var tile = project.getTile();
                    if (tile) {
                        entry.css('background-image', 'url(file://' + tile.split(path.sep).join('/') + ')');
                        entry.removeClass('icon');
                        entry.removeClass('icon-repo');
                    } else {
                        entry.css('background-image', '');
                        entry.addClass('icon');
                        entry.addClass('icon-repo');
                    }

                    entry.on('click', _this.openProject.bind(_this, project));
                    entry.find('.project-delete').on('click', function(ev) {
                        ev.stopPropagation();
                        return _this.removeProject(project, entry);
                    });
                    return _this.projectList.append(entry);
                }
            };
        })(this));
    };

    RecentProjectsView.prototype.removeProject = function(project, entry) {
        if (RecentProjectsManager == null) {
            RecentProjectsManager = require('./recent-projects-manager');
        }
        return RecentProjectsManager.remove(project, function(err) {
            if (err == null) {
                return entry.remove();
            }
        });
    };

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

    RecentProjectsView.prototype.openFolder = function() {
        if (remote == null) {
            remote = require('remote');
        }
        if (dialog == null) {
            dialog = remote.require('dialog');
        }
        return dialog.showOpenDialog({
            title: 'Open',
            properties: ['openDirectory', 'multiSelections', 'createDirectory']
        }, (function(_this) {
            return function(paths) {
                if (paths != null) {
                    var project = new Project({
                        paths: paths
                    });
                    return _this.openProject(project);
                }
            };
        })(this));
    };

    RecentProjectsView.prototype.createNewFile = function() {
        var dispath = atom.commands.dispatch(atom.views.getView(atom.workspace), 'application:new-file');
        atom.workspace.getActivePane().removeItem(this);
        return dispatch;
    };

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
