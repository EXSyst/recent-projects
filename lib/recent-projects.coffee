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
            exist = [ ]
            missing = data.length
            data.forEach (path, i) ->
                fs.exists path, (retval) ->
                    exist[i] = retval
                    if --missing == 0
                        data = data.filter (dummy, i) -> exist[i]
                        callback null, data

write = (data, callback) ->
    fs.truncate getStateFilePath(), 0, (err) =>
        if err?
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

module.exports =
    add: (url, callback) ->
        fn = (data) ->
            pos = data.indexOf url
            if pos >= 0
                data.splice pos, 1
            data.unshift url
            data.splice MAX_RECENT_PROJECTS
        alter fn, callback

    remove: (url, callback) ->
        fn = (data) ->
            pos = data.indexOf url
            if pos >= 0
                data.splice pos, 1
        alter fn, callback

    get: (callback) ->
        read callback

    clear: (callback) ->
        unlink callback
