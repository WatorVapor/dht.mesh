import net from 'net';
import fs from 'fs';
const server = net.createServer((connection) => {
  onConnected(connection);
});


const onConnected = (connection) => {
  console.log('onConnected::connection=<',connection,'>');
  connection.on('close', (evt) => {
    onClose(evt);
  });
  connection.on('data', (data) => {
    onData(data);
  });
  connection.on('error', (err) => {
    onError(err);
  });
}
const onClose = (evt) => {
  console.log('onClose::evt=<',evt,'>');  
}
const onError = (err) => {
  console.log('onError::err.message=<',err.message,'>');  
}
const onData = (data) => {
  console.log('onData::data.toString()=<',data.toString(),'>');  
}

try {
  fs.unlinkSync('/tmp/unix.sock');
} catch (error) {
  
}
server.listen('/tmp/unix.sock');
