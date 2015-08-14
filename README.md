# Recent projects
## Overview
This Atom package provides you with quick access to your recently opened projects.

## License
This package is licensed under the Apache License, Version 2.0 :

Copyright 2014-2015 Nicolas "Exter-N" L., Guilhem "Ener-Getick" N. and contributors

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

## Basic Usage
On Atom's startup, the package will list your 20 most recently opened projects.

It will then allow you to open one of them with a single click, instead of going through the menus and the directory explorer.

You can open it at any time using the command `recent-projects:open` (`ctrl-shift-O` on Windows and Linux, `cmd-shift-O` on Mac OS X) and navigate in your projects with your arrow keys.

## Customization
You can put a PNG image named `.project-tile.png` at a project's root, and the package will display it instead of the default icon.

There is a setting if you prefer a text-only list.

## Remote-FTP integration
This package can read [Remote-FTP](https://atom.io/packages/remote-ftp) config files. The remote path is displayed. If you want to auto connect your remote projects, there is a setting for that.
