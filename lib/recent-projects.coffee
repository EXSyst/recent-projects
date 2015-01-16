MAX_RECENT_PROJECTS = 20

path = require 'path'
fs = require 'fs'

getStateFilePath = ->
    path.join atom.getConfigDirPath(), 'recent-projects.json'

read = (callback) ->
    fs.readFile getStateFilePath(), { encoding: 'utf8' }, if callback then (err, data) ->
        if err?
            if err.code == 'ENOENT'
                callback null, [ ]
            else
                callback err
        else
            data = JSON.parse(data)
            projects = [ ]
            missing = data.length
            data.forEach (project, i) ->
                if typeof project is 'string'
                    project = { uri: project }
                fs.exists project.uri, (retval) ->
                    projects.push project
                    if --missing == 0
                        callback null, projects

write = (data, callback) ->
    fs.truncate getStateFilePath(), 0, (err) =>
        if err? and err.code != "ENOENT"
            if callback?
                callback err
        else
            fs.writeFile getStateFilePath(), JSON.stringify(data), { encoding: 'utf8' }, callback

alter = (fn, callback) ->
    read (err, data) ->
        if err?
            if callback?
                callback err
        else
            fn data
            write data, callback

unlink = (callback) ->
    fs.unlink getStateFilePath(), callback

compareUri = (searchUri, {uri}) ->
    uri is searchUri

module.exports =
    add: (uri, metadata, callback) ->
        entry = {}
        entry[k] = v for own k, v of metadata
        entry.uri = uri
        entry.lastOpened = Date.now()

        fn = (data) ->
            pos = data.findIndex compareUri.bind(null, uri)
            if pos >= 0
                data.splice pos, 1
            data.unshift entry
            data.splice MAX_RECENT_PROJECTS
        alter fn, callback

    remove: (uri, callback) ->
        fn = (data) ->
            pos = data.findIndex compareUri.bind(null, uri)
            if pos >= 0
                data.splice pos, 1
        alter fn, callback

    get: (callback) ->
        read callback

    clear: (callback) ->
        unlink callback
