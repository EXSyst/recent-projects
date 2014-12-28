{CompositeDisposable, ScrollView, $$} = require 'atom'
path = require 'path'
fs = require 'fs'
relativeDate = require 'relative-date'
RecentProjects = null
remote = null
dialog = null

homeDirectory = process.env[if process.platform == 'win32' then 'USERPROFILE' else 'HOME']
if homeDirectory?
    homeDirectory = path.resolve(homeDirectory)

relativeToHomeDirectory = (uri) ->
    return uri unless homeDirectory?
    uri = path.resolve(uri)
    if uri == homeDirectory
        "~"
    else if uri.length > homeDirectory.length and uri.substring(0, homeDirectory.length + 1) == homeDirectory + path.sep
        "~" + uri.substring(homeDirectory.length)
    else
        uri

module.exports =
class RecentProjectsView extends ScrollView
    @content: ->
        @div class: 'pane-item padded recent-projects-view', =>
            @div class: 'actions-bar', =>
                @button class: 'btn btn-default icon icon-file-directory', outlet:'openFolderButton', click: 'openFolder', 'Open Folder...'
                @button class: 'btn btn-default icon icon-file-code', outlet:'newFileButton', click: 'createNewFile', 'New File'
            @div class: 'alert alert-danger hidden', outlet: 'errorMessage'
            @ul class: 'project-list', outlet: 'projectList'

    initialize: ({ @uri }) ->
        super

        @subs = new CompositeDisposable
        @subs.add atom.config.observe 'recent-projects.openInNewWindow', (@newWindow) =>
        @subs.add atom.config.observe 'recent-projects.textOnly', (textOnly) =>
            if textOnly
                @projectList.addClass 'text-only'
            else
                @projectList.removeClass 'text-only'

        if atom.project.path?
            @newFileButton.addClass 'hidden'
        RecentProjects ?= require './recent-projects'
        RecentProjects.get (err, data) =>
            if err?
                @setError err
            else
                @setList data
                data.forEach ({uri, lastOpened}) =>
                    tileUri = path.join uri, ".project-tile.png"
                    fs.exists tileUri, (exist) =>
                        if exist
                            @setDetails uri,
                                tile: tileUri

    copy: -> new RecentProjectsView({ @uri })

    getUri: -> @uri

    getTitle: -> 'Recent Projects'

    getIconName: -> 'repo'

    setError: (err) ->
        if err
            @errorMessage.text '' + err
            @errorMessage.removeClass 'hidden'
            @projectList.addClass 'hidden'
        else
            @errorMessage.addClass 'hidden'
            @projectList.removeClass 'hidden'

    setList: (data) ->
        @projectList.empty()
        data.forEach ({uri, lastOpened}) =>
            unless uri == atom.project.path
                entry = $$ ->
                    @li 'data-uri': uri, class: 'project-entry btn btn-default icon icon-repo', =>
                        @div class: 'project-meta', =>
                            @div class: 'project-title', path.basename(uri)
                            @div class: 'project-url icon icon-file-directory', relativeToHomeDirectory(path.dirname(uri))
                            @div class: 'project-date icon icon-clock', =>
                              @text 'Opened '
                              @time datetime: new Date(lastOpened).toUTCString(), relativeDate(lastOpened)
                        @button class: 'project-delete btn btn-danger icon icon-x'
                entry.on 'click', @openProject.bind(this, [uri])
                entry.find('.project-delete').on 'click', (ev) =>
                    ev.stopPropagation()
                    @removeProject uri, entry
                @projectList.append entry

    setDetails: (uri, data) ->
        entry = @projectList.children().filter ->
            @getAttribute('data-uri') == uri
        if entry.length
            if 'tile' of data
                if data.tile
                    entry.css 'background-image', 'url(file://' + data.tile.split(path.sep).join('/') + ')'
                    entry.removeClass 'icon'
                    entry.removeClass 'icon-repo'
                else
                    entry.css 'background-image', ''
                    entry.addClass 'icon'
                    entry.addClass 'icon-repo'

    removeProject: (uri, entry) ->
        RecentProjects ?= require './recent-projects'
        RecentProjects.remove uri, (err) =>
            entry.remove() unless err?

    openProject: (pathsToOpen) ->
        atom.open { pathsToOpen, @newWindow }
        @closeAfterOpenProject() unless @newWindow

    openFolder: ->
        remote ?= require 'remote'
        dialog ?= remote.require 'dialog'
        dialog.showOpenDialog title: 'Open', properties: ['openDirectory', 'multiSelections', 'createDirectory'], (pathsToOpen) =>
            @openProject pathsToOpen if pathsToOpen?

    createNewFile: ->
        atom.workspace.getActivePane().removeItem this
        atom.workspaceView.trigger 'application:new-file'

    closeAfterOpenProject: ->
        if atom.project.path? or atom.workspaceView.getActivePaneView().getItems().length > 1 or parseFloat(atom.getVersion()) >= 0.124
            atom.workspace.getActivePane().removeItem this
            showTree = ->
                atom.workspaceView.trigger "tree-view:show"
            setTimeout showTree, 0
        else
            atom.close()
