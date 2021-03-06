/*
 * Copyright (c) 2012 Dmitri Melikyan
 *
 * Permission is hereby granted, free of charge, to any person obtaining a 
 * copy of this software and associated documentation files (the 
 * "Software"), to deal in the Software without restriction, including 
 * without limitation the rights to use, copy, modify, merge, publish, 
 * distribute, sublicense, and/or sell copies of the Software, and to permit 
 * persons to whom the Software is furnished to do so, subject to the 
 * following conditions:
 * 
 * The above copyright notice and this permission notice shall be included 
 * in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN 
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR 
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR 
 * THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


var fs = require('fs');
var os = require('os');
var util = require('util');
var path = require('path');


exports.profile = function(opt) {
  var nt = global._nodetime;
  if(!nt) {
    nt = global._nodetime = {version: '0.1.1'};
  }
  else {
    return;
  }


  if(!opt) opt = {stdout: false, debug: false};
  nt.token = opt.token;
  var stdout = nt.stdout = opt.stdout;  
  var debug = nt.debug = opt.debug;  

  nt.log = function(msg) {
    if(debug && msg) console.log('nodetime:', msg);
  };

  nt.error = function(e) {
    if(debug && e) console.error('nodetime error:', e, e.stack);
  };

  nt.dump = function(obj) {
    if(debug) console.log(util.inspect(obj, false, 10, true));
  };


  var timekit = undefined;
  try { timekit = require('timekit'); } catch(err) { nt.error(err) }

  nt.micros = function() {
    return timekit ? timekit.time() : new Date().getTime() * 1000;
  };

  nt.millis = function() {
    return timekit ? timekit.time() / 1000 : new Date().getTime();
  };

  nt.cputime = function() {
    return timekit ? timekit.cputime() : undefined;
  };


  var probes = {};
  var files = fs.readdirSync(path.dirname(require.resolve('./nodetime')) + '/probes');
  files.forEach(function(file) {
    var m = file.match('^(.*)\\.js$');
    if(m && m.length == 2) probes[m[1]] = true;
  });


  var proxy = require('./proxy');
  proxy.after(module.__proto__, 'require', function(obj, args, ret) {
    if(ret.__proxy__) {
      return;
    }

    var builtin = true;
    if(!args[0].match(/^[^\/\\]+$/)) {
      builtin = false;
    }

    if(!builtin) {
      path.exists(args[0] + '.probe', function(exists) {
        if(exists) {
          ret.__proxy__ = true; 
          require(args[0] + '.probe')(ret);
        }
      });
    }
    else if(probes[args[0]]) {
      ret.__proxy__ = true; 
      require('./probes/' + args[0])(ret);
    }
  });

  
  require('./info');
};


