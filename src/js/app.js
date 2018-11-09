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
let context = new Context();
let optionsMqtt = {QoS: 2, retain: true};

const UI_TO_BRAIN_CHANNEL = 'lea/ui/brain';
const TWITTER_TO_BRAIN_CHANNEL = 'lea/twitter/brain';
const ARDUINO_TO_BRAIN_CHANNEL = 'lea/arduino/brain';
const BRAIN_TO_BRAIN_CHANNEL = 'lea/brain/brain';
const BRAIN_TO_ARDUINO_CHANNEL = 'lea/brain/arduino';



//on se connecte au broker (localhost) et on suscribe aux command message
let clientMqtt = mqtt.connect('ws://localhost:3001', {
  clientId: 'lea_brain_' + os.hostname()
});

clientMqtt.on("connect", connection);
clientMqtt.on("message", onMessageReceived);

// Connexion au broker
function connection() {

  try {
    logger.log('debug', "client connecté pour recevoir des messages de twitter, de l'UI et de l'Arduino");
    clientMqtt.subscribe(UI_TO_BRAIN_CHANNEL, optionsMqtt);
    clientMqtt.subscribe(TWITTER_TO_BRAIN_CHANNEL, optionsMqtt);
    clientMqtt.subscribe(ARDUINO_TO_BRAIN_CHANNEL, optionsMqtt);

    // Envoi du Tweet de bienvenue
    messageFromTwitter(new Tweet('', '', Configuration.TEXT_LEA_START_UP));
  } catch (e){
    logger.log('error', 'Crash lors de la connexion au broker ' + e.stack);
		process.exit();
	}
}

function onMessageReceived(topic, strPayload) {

	try {
    if (topic == TWITTER_TO_BRAIN_CHANNEL) {
      logger.log('debug', "On reçoit un tweet de TWITTER");
      messageFromTwitter(JSON.parse(strPayload.toString()));
    } else if (topic == ARDUINO_TO_BRAIN_CHANNEL) {
      //logger.log('debug', "On reçoit un message de l'ARDUINO");
      //messageFromArduino(JSON.parse(strPayload.toString()))
    } else {
      logger.log('debug', "On reçoit un message de UI");
      messageFromUI(strPayload.toString());
    }
  } catch (e){
    logger.log('error', 'Crash lors de la récéption d\'un message ' + e.stack);
		process.exit();
	}
}

function messageFromTwitter(tweet) {

  // Configuration et stockage d'un tweet récemment reçu
  logger.log('info', "Ajout du nouveau tweet dans la file d'attente...");
  tweet.motion = Utils.getRandomMotion(tweet.sound);
  logger.log('debug', 'Affichage du tweet ' + tweet.LCDText);

  logger.log('info', "Demande au worker Arduino d'afficher le tweet");
  context.tweetDisplayed = tweet;
  context.isTweetDisplayed = true;
  logger.log('info', JSON.stringify(tweet));
  clientMqtt.publish(BRAIN_TO_ARDUINO_CHANNEL, JSON.stringify(tweet), optionsMqtt);
  setTimeout(() => {
    logger.log('info', "Le tweet a bien été envoyé");
  }, 10000);
}

function messageFromUI(message) {
  messageFromTwitter(new Tweet(Configuration.TWITTER_USER_NAME, Configuration.USER_TWITTER, message));
}


function messageFromArduino(message) {
    context.isTweetDisplayed = false;
    let tweet = message.tweet;
    if (message.action == Configuration.processConst.ACTION.END_SHOW_TWEET_ON_ARDUINO) {
      Utils.saveTweet(tweet);

      // On tansforme le tweet récemment affiché en tweet historisé
      if (tweet.fresh) {
        tweet.fresh = false;
        tweet.motion = null;
        context
          .historicTweets
          .push(tweet);
      }
      // Suppression du tweet frais
/*      context.freshTweets = context.freshTweets.filter(function(currentObject, index, arr){
        return currentObject.userName != tweet.userName && currentObject.screenName != tweet.screenName && currentObject.text != tweet.text;;
      });*/
    }

    // Si des tweets plus récent sont apparu, on les affiche
/*    logger.log('info', 'context.freshTweets.length %s', context.freshTweets.length);
    logger.log('info', 'context.freshTweets.length %d', context.freshTweets.length);
    logger.log('info', context.freshTweets.length);
    if (context.freshTweets.length > 0) {
      logger.log('info', JSON.stringify(tweet));
      let freshTweet = context.freshTweets[0];
      if (!context.isTweetDisplayed && context.tweetDisplayed != freshTweet) {
        context.isTweetDisplayed = true;
        clientMqtt.publish(BRAIN_TO_ARDUINO_CHANNEL, JSON.stringify(freshTweet), optionsMqtt);
      }
    }*/

    if (!context.isTweetDisplayed) {
      // Si la liste des tweets historique est plus grande, le progamme la tronque
      if (context.historicTweets.length > 10) {
        context.historicTweets = context
          .historicTweets
          .slice(0, 10);
      }

      // Si il existe des tweets historique, le programme les affiche de manière aléatoire
      if (context.historicTweets.length > 0) {
        let historicTweet = context.historicTweets[Utils.getRandomInt(0, context.historicTweets.length - 1)];
        context.isTweetDisplayed = true;
        clientMqtt.publish(BRAIN_TO_ARDUINO_CHANNEL, JSON.stringify(historicTweet), optionsMqtt);
      }
    }
}



