'use strict';
const fs = require('fs');
const { MongoClient } = require('mongodb');
const dbURL = `mongodb://%2Fdev%2Fshm%2Fmongodb-27017.sock`;
const connectOption = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}

class DHTStorage {
  constructor(config) {
    console.log('DHTStorage::constructor config=<',config,'>');
    this.config_ = config;
    const self = this;
    MongoClient.connect(dbURL,connectOption,(err, client)=>{
      //console.log('StorageKWMongo::connect:: err=<',err,'>');
      //console.log('StorageKWMongo::connect:: client=<',client,'>');
      if(!err) {
        self.mongo_ = client;
        self.onMongoCreated_();
      } else {
        console.log('StorageKWMongo::constructor:err=<', err,'>');
      }
    });    
  }
  store(address,msg) {
    //console.log('DHTStorage::store address=<',address,'>');
    console.log('DHTStorage::store msg=<',msg,'>');
    msg.address = address;
    this.channel_.insertOne(msg);
  }
  fetch(address) {
    console.log('DHTStorage::fetch address=<',address,'>');
    const findFilter = {
      address: address
    };
    this.channel_.find(findFilter).toArray( (error, result)=>{
      console.log('DHTStorage::fetch result=<',result,'>');
    });
  }

  onMongoCreated_() {
    this.pubsubdb_ = this.mongo_.db('dht_pubsub');    
    //console.log('DHTStorage::onMongoCreated_:this.channel_=<', this.channel_,'>');
    this.channel_ = this.pubsubdb_.collection('channel');
  }
}
module.exports = DHTStorage;

