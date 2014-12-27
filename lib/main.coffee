{CompositeDisposable} = require 'atom'

RecentProjects = null
RecentProjectsView = null

projectsHomepageUri = 'atom://recent-projects'

createView = ->
    RecentProjectsView ?= require './recent-projects-view'
    new RecentProjectsView({ uri: projectsHomepageUri })

destroyViews = ->
    RecentProjectsView ?= require './recent-projects-view'
    for pane in atom.workspace.getPanes()
        for item in pane.getItems()
            pane.removeItem item if item instanceof RecentProjectsView
    undefined

closeDefaultBuffer = ->
    cancelSub = false
    sub = atom.workspace.eachEditor (editor) ->
        if not cancelSub and editor.getUri() is undefined and not editor.getText()?.length
            fn = -> editor.destroy()
            setTimeout fn, 0
            cancelSub = true
            if sub?
                sub.off()
    if cancelSub
        sub.off()
        sub = null

viewOpener = (filePath) ->
    createView() if filePath is projectsHomepageUri

module.exports =
    config:
        textOnly:
            type: 'boolean'
            default: false

    activate: ->
        @subs = new CompositeDisposable
        @subs.add atom.workspace.addOpener viewOpener

        @subs.add atom.commands.add 'atom-workspace',
            'recent-projects:open': ->
                atom.workspace.open projectsHomepageUri

        if atom.project.path?
            RecentProjects ?= require './recent-projects'
            RecentProjects.add atom.project.path
        else
            atom.workspaceView.trigger 'recent-projects:open'
            closeDefaultBuffer()

    deactivate: ->
        @subs?.dispose()
        destroyViews()
