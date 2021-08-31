import net from 'net';
const client = net.createConnection('/tmp/unix.sock');
client.on('connect', (connection) => {
  onConnected(connection);
});
client.setNoDelay();

const onConnected = (connection) => {
  console.log('onConnected::connection=<',connection,'>');
}
client.on('data', (data) => {
  onData(data);
});
client.on('end', (evt) => {
  onEnd(evt);
});
client.on('error', (err) => {
  onError(err);
});

const onEnd = (evt) => {
  console.log('onEnd::evt=<',evt,'>');  
}
const onError = (err) => {
  console.log('onError::err.message=<',err.message,'>');  
}
const onData = (data) => {
  console.log('onData::data.toString()=<',data.toString(),'>');  
}


const msgObj = {
  l1:{
    l2:{
      l41:true,
      l42:12345,
    }
  }
};

/*
for(let i = 0;i < 32;i++) {
  msgObj.counter = i;
  msgObj.ts = new Date();
  const result = client.write(JSON.stringify(msgObj));
  console.log('onData::result=<',result,'>');
}
*/




setTimeout(()=> {
  writeOneByOne();
},0);

const writeOneByOne = () => {
  msgObj.ts = new Date();
  client.write(JSON.stringify(msgObj),'utf8',()=> {
    setTimeout(()=> {
      writeOneByOne();
    },1);    
  })  
}
