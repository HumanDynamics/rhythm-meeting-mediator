// Build file for the Breakout Plugin. Creates the Plugin.xml file
// needed by Google Hangouts, and uses the `config.json` at the root
//of the project dir.

// Install `swig`, `fs`, and `concat-files` locally through NPM,
// and then run build.js.

const swig = require('swig')
const fs = require('fs')
const concat = require('concat-files')

// Generate index.html template
var template = swig.compileFile('./index.template')
var output = template({
  serverUrl: 'https://breakout-dev.media.mit.edu'
})

fs.writeFile('index.tmp', output)

concat(['../header.xml', 'index.tmp', '../footer.xml'],
       '../plugin.xml',
       function () {
         fs.unlinkSync('index.tmp')
         console.log('Build finished, plugin created!')
       })

