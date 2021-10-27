const express = require('express'); 
const dotEnv = require('dotenv'); 
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const { fork } = require('child_process'); 
const path = require('path');
const mqtt = require('mqtt'); 

const mqttConfiguration = {
  host: 'broker.hivemq.com', 
  port: 1883, 
  device_id: 'SV-CONFIG-SERVER'
}


// realiza comunicação com o broker mqtt em que o simov está connectado
// para notificar mudanças na url de streaming
mqttClient = mqtt.connect({
  host: mqttConfiguration.host,
  port: mqttConfiguration.port,
}); 

// configura as variáveis de ambiente
dotEnv.config();

// cria uma lista para armazenar os subprocessos do servidor proxy
let currentRunningProxysRunning = [];
// const proxyServerProcess = 


// cria uma aplicação express
const app = express();

const CONFIG_SERVER_PORT = process.env.CONFIG_SERVER_PORT || 3333; 

app.use(express.json());
app.use(cors()); 

// cria rota de configuração
app.post(
  '/config', 
  body('url').isURL(),
  (request, response) => {

  const {url} = request.body; 

  const errors = validationResult(request);
  
  // verifica se não há erros no corpo da requisição
  if (!errors.isEmpty()) {
    return response.status(400).json({ errors: errors.array() });
  }
  // fecha o processo atual ou qualquer oultro que esteja rodando no momento

  currentRunningProxysRunning.forEach((process) => {
    process.send({close: 'close'});
    process.on('close', (code) => {
      console.log('processo fechado com sucesso');
    })
  }); 

  // limpa o vetor de todos os processos que já foram fechados
  currentRunningProxysRunning = []; 

  // cria um novo processo
  const newProxyServerProcess = fork(path.join(__dirname, `proxy-server.js`));
  newProxyServerProcess.send({url: url, port: process.env.PROXY_PORT || 8888});


  // adiciona o processo atual na lista de processos
  currentRunningProxysRunning.push(newProxyServerProcess);

  // notifica o SIMOV da alteração na url
  mqttClient.publish(
    'controlador/url', 
    `http://192.168.15.21:${process.env.PROXY_PORT || 8888}/stream`
  );

  // caso a configuração ocorra normalmente envia o status de OK
  return response.status(200).send();
}); 

app.listen(
  CONFIG_SERVER_PORT, 
  () => console.log(`servidor de configuração rodando na porta ${CONFIG_SERVER_PORT}`)
);