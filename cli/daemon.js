'use strict';
const path = require('path');
//console.log(':: __filename=<',__filename,'>');
const dhtPath = '/storage/dhtfs/cluster/dht_mesh_' + path.parse(__filename).name;
const config = {
  listen:{
    port:19990
  },
  entrance:[
    {
      host:'ermu4.wator.xyz',
      port:19990
    },
    {
      host:'ermu3.wator.xyz',
      port:19990
    }
  ],
  reps: {
    dht:dhtPath,
  },
  trap:true
};
//console.log(':: config=<',config,'>');
const DHT = require('../src/dht.js');
const dht = new DHT(config);
//console.log(':: dht=<',dht,'>');
const peer = dht.peerInfo();
console.log(':: peer=<',peer,'>');

const DHTDaemonWT = require('../api/DHTDaemonWT.js');
const daemon = new DHTDaemonWT(dht);



/*

const memwatch = require('@ardatan/node-memwatch');

function startHeapDiff() {
  // メモリ使用状況の最初のスナップショットを取得
  const hd = new memwatch.HeapDiff();
  // 2秒ごとにGC＆メモリ使用状況を出力
  setInterval(function generateHeapDumpAndStats() {
    // 1. 強制的にGCを行う
    try {
      global.gc();
    } catch (e) {
      console.log("次のコマンドで実行して下さい: 'node --expose-gc leak.js");
      process.exit();
    }
    // 2.メモリ使用状況を出力
    const heapUsed = process.memoryUsage().heapUsed;
    console.log(heapUsed + " バイト使用中")
  }, 2000);

  // CTRL + C でメモリ使用状況の終了直前のスナップショットを取得しdiffる
  process.on('SIGINT', function() {
    const diff = hd.end();
    // diff情報をコンソール出力:
    console.log("memwatch diff:", JSON.stringify(diff, null, 2));
    // diff情報をファイルにダンプするのも良いかも:
    // const fs = require("fs");
    // fs.writeFileSync("./memdiffdump.json", JSON.stringify(diff, null, 2));
    process.exit();
  });
}
startHeapDiff();
*/
