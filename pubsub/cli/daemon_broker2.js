'use strict';
const Broker = require('../broker.js');
const dht_port = 1334;
const dht_port_data = dht_port + 1;
const dht_config = {
  entrances: [
    {
      host:'ermu4.wator.xyz',
      portc:1234,
      portd:1234+1,
    },
    {
      host:'ermu3.wator.xyz',
      portc:1234,
      portd:1234+1,
    },
  ],
  reps: {
    dht:`/dev/shm/dht.pubsub2`
  },
  portc:dht_port,
  portd:dht_port_data,
  trap:true
};
const broker = new Broker(dht_config);
