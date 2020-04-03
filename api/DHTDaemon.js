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
        } else if(jMsg.store) {
          await this.onStoreData_(jMsg);
        } else if(jMsg.fetch) {
          this.onFetchData_(jMsg);
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

  async onStoreData_(jMsg) {
    //console.log('onStoreData_::jMsg=<',jMsg,'>');
    const storeResp = {
      cb:jMsg.cb,
      store:jMsg.store
    };
    if(jMsg.store === 'put') {
      const result = await this.onPutData_(jMsg.data,jMsg.cb);
      storeResp.result = result;
    } else if(jMsg.store === 'putBatch') {
      const result = await this.onPutDataBatch_(jMsg.data,jMsg.cb);
      storeResp.result = result;
    } else if(jMsg.store === 'delete') {
      this.onDeleteData_(jMsg.key,jMsg.cb);
    } else {
      console.log('onStoreData_::jMsg=<',jMsg,'>');
    }
    const RespBuff = Buffer.from(JSON.stringify(storeResp),'utf-8');
    try {
      this.publisher_.publish(jMsg.channel,RespBuff);
    } catch(e) {
      console.log('DHTDaemon::onStoreData_::::e=<',e,'>');
    }
  };

  async onPutData_ (data,cb) {
    //console.log('DHTDaemon::onPutData_::data=<',data,'>');
     const resource = await this.dht_.put(data,cb);
    //console.log('DHTDaemon::onPutData_::resource=<',resource,'>');
    return resource;
  }

  async onPutDataBatch_ (data,cb) {
    //console.log('DHTDaemon::onPutDataBatch_::data=<',data,'>');
     const resource = await this.dht_.putBatch(data,cb);
    //console.log('DHTDaemon::onPutDataBatch_::resource=<',resource,'>');
    return resource;
  }

  onDeleteData_(key,cb) {
    console.log('DHTDaemon::onDeleteData_::jMsg=<',jMsg,'>');
  }


  onFetchData_(jMsg){
    //console.log('DHTDaemon::onFetchData::jMsg=<',jMsg,'>');
    if(jMsg.fetch === 'get') {
      this.onFetchDataByAddress_(jMsg.address,jMsg.cb,jMsg.channel);
    } else if(jMsg.fetch === '??') {
    } else {
      console.log('DHTDaemon::onFetchData::jMsg=<',jMsg,'>');
    }
  };




  onFetchDataByAddress_ (address,cb,channel){
    //console.log('DHTDaemon::onFetchDataByAddress_::address=<',address,'>');
    //console.log('DHTDaemon::onFetchDataByAddress_::cb=<',cb,'>');
    //console.log('DHTDaemon::onFetchDataByAddress_::channel=<',channel,'>');
    const fetchResp = {
      cb:cb,
      address:address,
      fetchResp:{
      }
    };
    const self = this;
    this.dht_.get(address,cb,(content) => {
      fetchResp.fetchResp.content = content;
      const RespBuff = Buffer.from(JSON.stringify(fetchResp),'utf-8');
      try {
        self.publisher_.publish(channel,RespBuff);
      } catch(e) {
        console.log('DHTDaemon::onFetchDataByAddress_::::e=<',e,'>');
      }
    });
  }
};

module.exports = DHTDaemon;
