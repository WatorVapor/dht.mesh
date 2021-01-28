'use strict';
const os = require('os');
const dgram = require("dgram");

class PeerMachine {
  constructor(config) {
    this.config_ = config;
  }
  readMachienIp() {
    const ips = [];
    const interfaces = os.networkInterfaces();
    //console.log('readMachienIp__ interfaces=<',interfaces,'>');
    for (const [dev, infos] of Object.entries(interfaces)) {
      //console.log('onListenDataServer dev=<',dev,'>');
      //console.log('onListenDataServer infos=<',infos,'>');
      for (const info of infos) {
        if (info.family === 'IPv6') {
          ips.push(info.address);
        }
      }
    }
    const outnet = this.filtoutLocalLink__(ips);
    return outnet;
  }
  filtoutLocalLink__(ips) {
    let outIps = [];
    for (const ip of ips) {
      if(!this.config_.localhost) {
        if(ip === '::1') {
          continue;
        }
      }
      //console.log('filtoutLocalLink__ ip=<',ip,'>');
      const isLocalLink = ip.startsWith('fe80::');
      //console.log('filtoutLocalLink__ isLocalLink=<',isLocalLink,'>');
      if(!isLocalLink) {
        outIps.push(ip);
      }
    }
    //console.log('filtoutLocalLink__ outIps=<',outIps,'>');
    return outIps;
  }
}

module.exports = PeerMachine;