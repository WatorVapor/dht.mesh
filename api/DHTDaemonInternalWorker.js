'use strict';
const redis = require('redis');
const redisOption = {
  path:'/dev/shm/dht.ermu.api.redis.sock'
};
const DefaultDaemonListenChannel = 'dht.mesh.api.daemon.listen';


class WTRedisClient {
  constructor(clientChannel) {
    this.remoteSubChannels_ = [];
    if(clientChannel) {
      this.createDaemonChannel_(clientChannel);
    } else {
      this.createDaemonChannel_(DefaultDaemonListenChannel);
    }
  }
  async onClientMsg_ (data) {
    //console.log('WTRedisClient::onClientMsg_::data=<',data.toString(),'>');
    try {
      const jMsg = JSON.parse(data.toString());
      //console.log('WTRedisClient::onClientMsg_::jMsg=<',jMsg,'>');
      if(jMsg) {
        if(jMsg.ping) {
          this.onPing_(jMsg);
        } else if(jMsg.subscribe) {
          this.onSubscribeData_(jMsg);
        } else {
          parentPort.postMessage(jMsg);
        }
      } else {
        console.log('WTRedisClient::onClientMsg_::data=<',data.toString(),'>');
      }
    } catch(e) {
      console.log('WTRedisClient::onClientMsg_::e=<',e,'>');
    }
  };
  parentMsg(msgResp) {
    console.log('WTRedisClient::parentMsg::msgResp=<',msgResp,'>'); 
    if(msgResp) {
      if(msgResp.channel) {
        //this.publisher_(msgResp.channel,JSON.stringify(msgResp));
      } else if(msgResp.remoteSpread) {
        for(const remoteSub of this.remoteSubChannels_) {
          this.publisher_.publish(remoteSub,JSON.stringify(msgResp));
        }
      } else if(msgResp.remoteDelivery) {
        for(const remoteSub of this.remoteSubChannels_) {
          this.publisher_.publish(remoteSub,JSON.stringify(msgResp));
        }
      } else {
        console.log('WTRedisClient::parentMsg::data=<',msgResp,'>');
      }
    } else {
      console.log('WTRedisClient::parentMsg::data=<',msgResp,'>');
    }
  }


  async onLoopbackData_(jMsg) {
    //console.log('WTRedisClient::onLoopbackData_::jMsg=<',jMsg,'>');
    try {
      const RespBuff = Buffer.from(JSON.stringify(jMsg),'utf-8');
      for(const remoteSub of this.remoteSubChannels_) {
        this.publisher_.publish(remoteSub,RespBuff);
      }
    } catch(e) {
      console.log('WTRedisClient::onLoopbackData_::::e=<',e,'>');
    }
  };
  onSubscribeData_(jMsg) {
    //console.log('WTRedisClient::onSubscribeData_::jMsg=<',jMsg,'>');
    this.remoteSubChannels_.push(jMsg.channel);
  }

  onRemoteSpread_(spreadMsg) {
    //console.log('WTRedisClient::onRemoteSpread_ spreadMsg=<',spreadMsg,'>');
    for(const remoteSub of this.remoteSubChannels_) {
      const meshResp = {
        remoteSpread:spreadMsg
      };
      this.publisher_.publish(remoteSub,JSON.stringify(meshResp));
    }
  }

  createDaemonChannel_(clientChannel) {
    this.subscriber_ = redis.createClient(redisOption);
    const self = this;
    this.subscriber_.on('ready',() => {
      console.log('WTRedisClient::createDaemonChannel_ subscriber_ ready');
      if(clientChannel) {
        self.subscriber_.subscribe(clientChannel);
      } else {
        self.subscriber_.subscribe(DefaultDaemonListenChannel);
      }
    })
    this.subscriber_.on('message',(channel,message) => {
      self.onClientMsg_(message);
    });    
    this.subscriber_.on('error', (error) => {
      console.log('WTRedisClient::createDaemonChannel_ subscriber_ error=<',error,'>');
      setTimeout(()=>{
        self.createDaemonChannel_(apiChannel);
      },1000);
    });
    
    this.publisher_ = redis.createClient(redisOption);
    this.subscriber_.on('ready',() => {
      console.log('WTRedisClient::createDaemonChannel_ publisher ready');
    })
    this.publisher_.on('error', (error) => {
      console.log('WTRedisClient::createDaemonChannel_ publisher_ error=<',error,'>');
      setTimeout(()=>{
        self.createDaemonChannel_();
      },1000);
    });
 }
 
 onPing_(jMsg) {
    const meshResp = {
      pong:true
    };
    const RespBuff = Buffer.from(JSON.stringify(meshResp),'utf-8');
    try {
      this.publisher_.publish(jMsg.channel,RespBuff);
    } catch(e) {
      console.log('WTRedisClient::onPing_::::e=<',e,'>');
    }   
 }
};

const { parentPort,workerData  } = require('worker_threads');
console.log('::parentPort=<',parentPort,'>');
console.log('::workerData=<',workerData,'>');
const wtRedis = new WTRedisClient(workerData);

parentPort.on('message',parentMsg => {
  //console.log('::parentMsg=<',parentMsg,'>');
  wtRedis.parentMsg(parentMsg);
});
