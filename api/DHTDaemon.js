'use strict';
const redis = require('redis');
const redisOption = {
  path:'/dev/shm/dht.ermu.api.redis.sock'
};
const DefaultDaemonListenChannel = 'dht.mesh.api.daemon.listen';
class DHTDaemon {
  constructor(dht,apiChannel) {
    this.dht_ = dht;
    this.subscriber_ = redis.createClient(redisOption);
    if(apiChannel) {
      this.subscriber_.subscribe(apiChannel);
    } else {
      this.subscriber_.subscribe(DefaultDaemonListenChannel);
    }
    const self = this;
    this.subscriber_.on('message',async (channel,message) => {
      await self.onData_(message);
    });
    this.publisher_ = redis.createClient(redisOption);
  }
  
  onConnection_(connection) {
    //console.log('DHTDaemon::onConnection_:connection=<',connection,'>');
    try {
      connection.setNoDelay();
    } catch(e) {
      console.log('DHTDaemon::onConnection_::::e=<',e,'>');
    }
    const self = this;
    connection.on('data', (data) => {
      self.onData_(data,connection);
    });
  };

  async onData_ (data) {
    //console.log('DHTDaemon::onData_::data=<',data.toString(),'>');  
    try {
      const jMsg = JSON.parse(data.toString());
      //console.log('DHTDaemon::onData_::jMsg=<',jMsg,'>');
      if(jMsg) {
        if(jMsg.peerInfo) {
          await this.onPeerInfo_(jMsg);
        } else if(jMsg.mesh) {
          await this.onMeshData_(jMsg);
        } else {
          console.log('DHTDaemon::onData_::jMsg=<',jMsg,'>');
        }
      }
    } catch(e) {
      console.log('DHTDaemon::onData_::e=<',e,'>');
    }
  };


  async onPeerInfo_ (jMsg){
    const peer = this.dht_.peerInfo();
    //console.log('DHTDaemon::onPeerInfo_:: peer=<',peer,'>');
    const peerInfoResp = {
      peerInfo:peer,
      cb:jMsg.cb
    };
    const RespBuff = Buffer.from(JSON.stringify(peerInfoResp),'utf-8');
    try {
      this.publisher_.publish(jMsg.channel,RespBuff);
    } catch(e) {
      console.log('DHTDaemon::onPeerInfo_::::e=<',e,'>');
    }
  };

  async onMeshData_(jMsg) {
    console.log('onMeshData_::jMsg=<',jMsg,'>');
    const meshResp = {
      cb:jMsg.cb,
      mesh:jMsg.mesh
    };
    this.dht_.push(jMsg.mesh,jMsg.cb);
    const RespBuff = Buffer.from(JSON.stringify(meshResp),'utf-8');
    try {
      this.publisher_.publish(jMsg.channel,RespBuff);
    } catch(e) {
      console.log('DHTDaemon::onMeshData_::::e=<',e,'>');
    }
  };

};

module.exports = DHTDaemon;
