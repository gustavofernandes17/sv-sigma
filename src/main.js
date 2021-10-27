const express = require('express'); 
const dotEnv = require('dotenv'); 
const cors = require('cors');
const MjpegProxy = require('node-mjpeg-proxy'); 
const { body, validationResult } = require('express-validator');
const mqtt = require('mqtt'); 
const {parse} = require('url'); 

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

// cria uma aplicação express
const app = express();

const CONFIG_SERVER_PORT = process.env.PORT || 3333; 

app.use(express.json());
app.use(cors()); 

// cria uma instância do proxy
const mjpegProxy = new MjpegProxy('http://mjpeg.sanford.io/count.mjpeg');

// rota comum só para saber se tá tudo certo
app.get('/', (request, response) => {
  return response.status(200).send(`Servidor de Configuração Rodando na porta ${CONFIG_SERVER_PORT}`);
})

// rota de streaming do proxy 
app.get('/stream', mjpegProxy.proxyRequest);

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

  console.log(`rota anterior - ${mjpegProxy.mjpegOptions.href}`);

  // atualiza as configuraçãoes
  mjpegProxy.mjpegOptions = parse(url);

  console.log(`rota atual - ${mjpegProxy.mjpegOptions.href}`);

  // caso a configuração ocorra normalmente envia o status de OK
  return response.status(200).send(`rota alterada com sucesso`);
}); 

// eventos do proxy
mjpegProxy.on('streamstart', function(data){
  console.log("streamstart - " + data);
});

mjpegProxy.on('streamstop', function(data){
  console.log("streamstop - " + data);
});

mjpegProxy.on('error', function(data){
  console.log("msg: " + data.msg);
  console.log("url: " + data.url);	
});

// servidor começa a esperar por requisições
app.listen(
  CONFIG_SERVER_PORT, 
  () => console.log(`servidor de configuração rodando na porta ${CONFIG_SERVER_PORT}`)
);