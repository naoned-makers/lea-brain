import cluster from 'cluster';

import Tweet from "./models/tweet";
import Configuration from "./config/configuration";
import Context from "./models/context";


import * as Utils from "./helpers/utils";
import logger from "./helpers/log";
import { playSound } from './helpers/sound';

import mqtt from "mqtt";
import os from "os";


// lodash
import _ from 'lodash/array';


/*
 * Les clusters Node
 */
playSound("bonjourMakerFaire.1");


/*
 * Le contexte d'exécution du master
 */
var context = new Context();

const UI_CHANNEL = 'lea/ui/brain';
const TWITTER_CHANNEL = 'lea/twitter/brain';


//on se connecte au broker (localhost) et on suscribe aux command message
let clientMqtt = mqtt.connect('ws://localhost:3001', {
  clientId: 'lea_brain_' + os.hostname()
});

// Connexion au broker
clientMqtt.on('connect', function () {
  logger.log('debug', "client connecté pour recevoir des messages de twitter");
  clientMqtt.subscribe(UI_CHANNEL);
  clientMqtt.subscribe(TWITTER_CHANNEL);
});

clientMqtt.on('message', function (topic, strPayload) {
  
  
  if (topic == TWITTER_CHANNEL) {
    logger.log('debug', "On reçoit un tweet de TWITTER");
    messageFromTwitter(JSON.parse(strPayload.toString()));
  } else {
    logger.log('debug', "On reçoit un tweet de UI");
    messageFromUI(strPayload.toString());
  }
});

function messageFromTwitter(tweet) {
  //let tweet = payload.tweet;

  // Configuration et stockage d'un tweet récemment reçu
  logger.log('info', "Ajout du nouveau tweet dans la file d'attente...");
  context.freshTweets.push(tweet);



  tweet.motion = Utils.getRandomMotion(tweet.sound);
  logger.log('debug', 'Le tweet à afficher : ');
  logger.log('debug', tweet);

  
  //if (!context.isTweetDisplayed) {
    logger.log('info', "Demande au worker Arduino d'afficher le tweet");
    context.tweetDisplayed = tweet;
    context.isTweetDisplayed = true;
    //clientMqtt.publish('lea/brain/arduino', JSON.stringify(tweet));
    logger.log('info', JSON.stringify(tweet));
    clientMqtt.publish('lea/brain/arduino', JSON.stringify(tweet));
    //clusterArduino.send(tweet);
  // }

}

function messageFromUI(message) {
  messageFromTwitter(new Tweet('leanm', 'lea_nmakers', message));
}



