'use strict';
const unix = require('unix-dgram');
const execSync = require('child_process').execSync;
const debug_ = true;
class ApiUnxiUdp {
  constructor(onMsg) {
    if(debug_) {
    }
    this.client_ = unix.createSocket('unix_dgram');
    this.onMsg_ = onMsg;
  }
  
  bindUnixSocket(path) {
    const udpServer = unix.createSocket('unix_dgram');
    udpServer.on('listening', () => {
      console.log('ApiUnxiUdp::bindUnixSocket: listening udpServer =<',udpServer,'>');
    });
    const self = this;
    udpServer.on('message', (message, remote) =>{
      //console.log('ApiUnxiUdp::bindUnixSocket: message message =<',message.toString(),'>');
      //console.log('ApiUnxiUdp::bindUnixSocket: message remote =<',remote,'>');
      try {
        const jMsg = JSON.parse(message.toString());
        if(typeof self.onMsg_ === 'function') {
          self.onMsg_(jMsg);
        }
      } catch(err) {
        console.log('ApiUnxiUdp::bindUnixSocket: message err =<',err,'>');
      }
    });
    const cmdRM = `rm -rf ${path}`;
    const resultRM =  execSync(cmdRM);
    console.log('ApiUnxiUdp::bindUnixSocket: resultRM =<',resultRM.toString(),'>');
    udpServer.bind(path);
    const cmdChmod = `chmod 777  ${path}`
    const resultChmod =  execSync(cmdChmod);
    console.log('ApiUnxiUdp::bindUnixSocket: resultChmod =<',resultChmod.toString(),'>');

  }
  send(cmd,path) {
    const cmdMsg = Buffer.from(JSON.stringify(cmd));
    this.client_.send(cmdMsg, 0, cmdMsg.length, path);    
  }
};
module.exports = ApiUnxiUdp;
