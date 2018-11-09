import cluster from 'cluster';

import Tweet from "./models/tweet";
import Configuration from "./config/configuration";
import Context from "./models/context";


import * as Utils from "./helpers/utils";
import logger from "./helpers/log";
import { playSound } from './helpers/sound';

import mqtt from "mqtt";
import os from "os";


/*
 * Les clusters Node
 */
playSound("bonjourMakerFaire.1");


/*
 * Le contexte d'exécution du master
 */
let freshTweets = [];
let historicalTweets = [];
let iscurrentTweetFresh = false;

const BRAIN_TO_BRAIN_CHANNEL = 'lea/brain/brain';
const BRAIN_TO_ARDUINO_CHANNEL = 'lea/arduino/brain';


//on se connecte au broker (localhost) et on suscribe aux command message
let clientMqtt = mqtt.connect('ws://localhost:3001', {
  clientId: 'lea_brain_queue_' + os.hostname()
});

clientMqtt.on("connect", connection);
clientMqtt.on("message", onMessageReceived);

// Connexion au broker
function connection() {

    logger.log('debug', "Connexion pour empiler les messages");
    clientMqtt.subscribe(BRAIN_TO_BRAIN_CHANNEL);
}

function onMessageReceived(topic, payload) {

  let tweet = JSON.parse(payload.toString());
  logger.log('debug', "Empilement du message " + tweet.text);

  printTweet(tweet);

}

function printTweet(tweet) {
  if (!iscurrentTweetFresh) {
    logger.log('debug', 'Affichage du tweet ' + tweet.LCDText);
    iscurrentTweetFresh = true;
    clientMqtt.publish(BRAIN_TO_ARDUINO_CHANNEL, JSON.stringify(tweet));
  } else {
    iscurrentTweetFresh = false;
    freshTweets.push(tweet);
  }
}



