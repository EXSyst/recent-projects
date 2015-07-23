var CompositeDisposable = require('atom').CompositeDisposable;

var RecentProjectsManager = require('./recent-projects-manager');
var RecentProjectsView = require('./recent-projects-view');
var Project = require('./project');
var projectsHomepageUri = 'atom://recent-projects';
var fs = require("fs");
var path = require("path");

var createView = function() {
    return new RecentProjectsView({
        uri: projectsHomepageUri
    });
};

var destroyViews = function() {
    var ref = atom.workspace.getPanes();
    for (var i = 0, len = ref.length; i < len; i++) {
        var pane = ref[i];
        var ref1 = pane.getItems();
        for (var j = 0, len1 = ref1.length; j < len1; j++) {
            var item = ref1[j];
            if (item instanceof RecentProjectsView) {
                pane.removeItem(item);
            }
        }
    }
    return void 0;
};

var closeDefaultBuffer = function() {
    var ref;
    var cancelSub = false;
    var sub = atom.workspace.observeTextEditors(function(editor) {
        if (!cancelSub && editor.getURI() === void 0 && !((ref = editor.getText()) != null ? ref.length : void 0)) {
            var fn = function() {
                return editor.destroy();
            };
            setTimeout(fn, 0);
            cancelSub = true;
            if (sub != null) {
                return sub.dispose();
            }
        }
    });
    if (cancelSub) {
        sub.dispose();
        return sub = null;
    }
};

var viewOpener = function(filePath) {
    if (filePath === projectsHomepageUri) {
        return createView();
    }
};

var processProject = function(projectPaths) {
    if (!projectPaths.length) {
        return;
    }

    if (atom.config.get('recent-projects.autoConnectFtp') && projectPaths.length) {
        fs.exists(path.join(projectPaths[0], '.ftpconfig'), function(exists) {
            if (exists) {
                atom.commands.dispatch(atom.views.getView(atom.workspace), 'remote-ftp:connect');
            }
        });
    }
    var project = new Project({
        paths: projectPaths,
        devMode: atom.inDevMode()
    });
    RecentProjectsManager.add(project);
}

module.exports = {
    config: {
        textOnly: {
            type: 'boolean',
            "default": false
        },
        openInNewWindow: {
            type: 'boolean',
            "default": false,
            description: 'Projects will be opened in a new window, keeping the Recent Projects window open.'
        },
        showGitBranch: {
            type: 'boolean',
            "default": true
        },
        showLastOpened: {
            type: 'boolean',
            "default": true
        },
        showExtraPaths: {
            type: 'boolean',
            "default": true
        },
        showFtpUrl: {
            type: 'boolean',
            "default": true
        },
        autoConnectFtp: {
            type: 'boolean',
            "default": false,
            description: 'If a .ftpconfig is detected, remote-ftp:connect from the package remote-ftp is auto launched.'
        },
        maxProjects: {
            type: 'integer',
            "default": 20,
            description: 'Max projects to save and display.'
        }
    },
    activate: function() {
        this.subs = new CompositeDisposable;
        this.subs.add(atom.workspace.addOpener(viewOpener));
        this.subs.add(atom.commands.add('atom-workspace', {
            'recent-projects:open': function() {
                return atom.workspace.open(projectsHomepageUri);
            }
        }));

        atom.project.onDidChangePaths(processProject);
        processProject(atom.project.getPaths());
        if (!atom.project.getPaths().length) {
            atom.commands.dispatch(atom.views.getView(atom.workspace), 'recent-projects:open');
            return closeDefaultBuffer();
        }
        return void 0;
    },
    deactivate: function() {
        var ref;
        if ((ref = this.subs) != null) {
            ref.dispose();
        }
        return destroyViews();
    }
};
