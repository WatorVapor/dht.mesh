'use strict';
const Subscriber = require('../subscriber.js');
const sub = new Subscriber((channel,message)=>{
  console.log('test_subscriber::channel=<',channel,'>');
  console.log('test_subscriber::message=<',message,'>');
});
sub.subscribe('aaa');
