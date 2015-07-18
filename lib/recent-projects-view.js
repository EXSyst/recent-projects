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

var ref = require('atom'), CompositeDisposable = ref.CompositeDisposable, GitRepository = ref.GitRepository, ScrollView = require('atom-space-pen-views').ScrollView, $$ = require('atom-space-pen-views').$$;
var path = require('path');
var fs = require('fs');
var relativeDate = require('relative-date');

var RecentProjectsView;
var RecentProjects = null;
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
    this.subs.add(atom.config.observe('recent-projects.textOnly', (function(_this) {
      return function(textOnly) {
        return _this.projectList.toggleClass('text-only', textOnly);
      };
    })(this)));
    if (atom.project.path != null) {
      this.newFileButton.addClass('hidden');
    }
    if (RecentProjects == null) {
      RecentProjects = require('./recent-projects');
    }
    return RecentProjects.get((function(_this) {
      return function(err, data) {
        if (err != null) {
          return _this.setError(err);
        } else {
          _this.setList(data);
          return data.forEach(function(arg1) {
            if(typeof arg1.paths === 'undefined') {
              return;
            }
            var lastOpened, tileUri, hasTile, paths;
            paths = arg1.paths, lastOpened = arg1.lastOpened;
            paths.forEach(function(arg2) {
              if(hasTile)
                return;
              tileUri = path.join(arg2, ".project-tile.png");
              return fs.exists(tileUri, function(exist) {
                if (exist) {
                  hasTile = true;
                }
              });
            });
            return _this.setDetails(paths, {
              tile: hasTile ? tileUri : null
            });
          });
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
        var branch, entry, lastOpened, repo, paths;
        paths = project.paths, lastOpened = project.lastOpened;
        if (paths !== atom.project.getPaths()) {
          try {
            repo = new GitRepository(uri);
            branch = repo.getShortHead();
            repo.destroy();
          } catch (_error) {}
          entry = $$(function() {
            return this.li({
              'data-uri': JSON.stringify(paths),
              "class": 'project-entry btn btn-default icon icon-repo'
            }, (function(_this) {
              return function() {
                _this.div({
                  "class": 'project-meta'
                }, function() {
                  _this.div({
                    "class": 'project-title'
                  }, path.basename(paths[0]));
                  _this.div({
                    "class": 'project-url icon icon-file-directory'
                  }, relativeToHomeDirectory(path.dirname(paths[0])));
                  _this.br();
                  if (project.devMode) {
                    _this.div({
                      "class": 'project-meta-mini project-dev-mode icon icon-color-mode'
                    }, 'dev mode');
                  }
                  if (branch != null) {
                    _this.div({
                      "class": 'project-meta-mini project-branch icon icon-git-branch'
                    }, branch);
                  }
                  if (lastOpened != null) {
                    return _this.div({
                      "class": 'project-meta-mini project-date icon icon-clock'
                    }, function() {
                      return _this.time({
                        datetime: new Date(lastOpened).toUTCString()
                      }, relativeDate(lastOpened));
                    });
                  }
                });
                _this.button({
                  "class": 'project-star btn btn-danger icon icon-star'
                });
                return _this.button({
                  "class": 'project-delete btn btn-danger icon icon-x'
                });
              };
            })(this));
          });
          entry.on('click', _this.openProject.bind(_this, paths, entry));
          entry.find('.project-delete').on('click', function(ev) {
            ev.stopPropagation();
            return _this.removeProject(paths, entry);
          });
          return _this.projectList.append(entry);
        }
      };
    })(this));
  };

  RecentProjectsView.prototype.setDetails = function(paths, data) {
    var entry;
    entry = this.projectList.children().filter(function() {
      return this.getAttribute('data-uri') === JSON.stringify(paths);
    });
    if (entry.length) {
      if ('tile' in data) {
        if (data.tile) {
          entry.css('background-image', 'url(file://' + data.tile.split(path.sep).join('/') + ')');
          entry.removeClass('icon');
          return entry.removeClass('icon-repo');
        } else {
          entry.css('background-image', '');
          entry.addClass('icon');
          return entry.addClass('icon-repo');
        }
      }
    }
  };

  RecentProjectsView.prototype.removeProject = function(paths, entry) {
    if (RecentProjects == null) {
      RecentProjects = require('./recent-projects');
    }
    return RecentProjects.remove(paths, function(err) {
      if (err == null) {
        return entry.remove();
      }
    });
  };

  RecentProjectsView.prototype.openProject = function(pathsToOpen, project) {
    var devMode;
    if (project == null) {
      project = {};
    }
    devMode = project.devMode;
    atom.open({
      pathsToOpen: pathsToOpen,
      newWindow: this.newWindow,
      devMode: devMode
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
      return function(pathsToOpen) {
        if (pathsToOpen != null) {
          return _this.openProject(pathsToOpen);
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
