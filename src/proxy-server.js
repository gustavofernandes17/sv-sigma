const MjpegProxy = require('node-mjpeg-proxy'); 
const express = require('express');
const cors = require('cors'); 
const dotEnv = require('dotenv'); 
const app = express(); 

dotEnv.config();

const PORT = 8888 || process.env.PROXY_PORT;

process.on('message', (message) => {
  
  console.log(message);

  if (message.close) {
    console.log('fechando o processo atual');
    return process.exit(0);
  }

  if (message.url) {
    // cria uma instancia do proxy
    const proxy = new MjpegProxy(message.url); 
    
    app.use(cors());

    app.get('/stream', proxy.proxyRequest); 
    // Events
    proxy.on('streamstart', function(data){
      console.log("streamstart - " + data);
    });

    proxy.on('streamstop', function(data){
      console.log("streamstop - " + data);
    });

    proxy.on('error', function(data){
      console.log("msg: " + data.msg);
      console.log("url: " + data.url);	
    });


    app.listen(PORT || message.port, () => console.log(`servidor proxy rodando na porta ${PORT}`)); 
  }
})



// // configura o cross-origin-resource-sharing
