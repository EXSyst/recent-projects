var CompositeDisposable = require('atom').CompositeDisposable;

var RecentProjects = null;
var RecentProjectsView = null;
var projectsHomepageUri = 'atom://recent-projects';

var createView = function() {
    if (RecentProjectsView == null) {
        RecentProjectsView = require('./recent-projects-view');
    }
    return new RecentProjectsView({
        uri: projectsHomepageUri
    });
};

var destroyViews = function() {
    if (RecentProjectsView == null) {
        RecentProjectsView = require('./recent-projects-view');
    }
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
    var sub = atom.workspace.getTextEditors.forEach(function(editor) {
        if (!cancelSub && editor.getURI() === void 0 && !((ref = editor.getText()) != null ? ref.length : void 0)) {
            var fn = function() {
                return editor.destroy();
            };
            setTimeout(fn, 0);
            cancelSub = true;
            if (sub != null) {
                return sub.off();
            }
        }
    });
    if (cancelSub) {
        sub.off();
        return sub = null;
    }
};

var viewOpener = function(filePath) {
    if (filePath === projectsHomepageUri) {
        return createView();
    }
};

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
        if (atom.project.getPaths().length > 0) {
            if (RecentProjects == null) {
                RecentProjects = require('./recent-projects');
            }
            atom.project.getPaths().forEach(function(path) {
                return RecentProjects.add(path, {
                    devMode: atom.inDevMode()
                });
            });
        }
        else {
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
