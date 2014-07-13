RecentProjects = null
RecentProjectsView = null

projectsHomepageUri = 'atom://recent-projects'

createView = ->
    RecentProjectsView ?= require './recent-projects-view'
    new RecentProjectsView({ uri: projectsHomepageUri })

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

module.exports =
    activate: ->
        atom.workspace.registerOpener (filePath) =>
            createView() if filePath is projectsHomepageUri

        atom.workspaceView.command 'recent-projects:open', ->
            atom.workspace.open projectsHomepageUri

        if atom.project.path?
            RecentProjects ?= require './recent-projects'
            RecentProjects.add atom.project.path
        else
            atom.workspaceView.trigger 'recent-projects:open'
            closeDefaultBuffer()
