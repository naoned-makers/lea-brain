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
var context = new Context();

const UI_CHANNEL = 'lea/ui/brain';
const TWITTER_CHANNEL = 'lea/twitter/brain';
const ARDUINO_CHANNEL = 'lea/arduino/brain';


//on se connecte au broker (localhost) et on suscribe aux command message
let clientMqtt = mqtt.connect('ws://localhost:3001', {
  clientId: 'lea_brain_' + os.hostname()
});

// Connexion au broker
clientMqtt.on('connect', function () {
  logger.log('debug', "client connecté pour recevoir des messages de twitter");
  clientMqtt.subscribe(UI_CHANNEL);
  clientMqtt.subscribe(TWITTER_CHANNEL);
  clientMqtt.subscribe(ARDUINO_CHANNEL);
});

clientMqtt.on('message', function (topic, strPayload) {
  
  
  if (topic == TWITTER_CHANNEL) {
    logger.log('debug', "On reçoit un tweet de TWITTER");
    messageFromTwitter(JSON.parse(strPayload.toString()));
  } else if (topic == ARDUINO_CHANNEL) {
    logger.log('debug', "On reçoit un message de l'ARDUINO");
    messageFromArduino(JSON.parse(strPayload.toString()))
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

  
  if (!context.isTweetDisplayed) {
    logger.log('info', "Demande au worker Arduino d'afficher le tweet");
    context.tweetDisplayed = tweet;
    context.isTweetDisplayed = true;
    //clientMqtt.publish('lea/brain/arduino', JSON.stringify(tweet));
    logger.log('info', JSON.stringify(tweet));
    clientMqtt.publish('lea/brain/arduino', JSON.stringify(tweet));
  }

}

function messageFromUI(message) {
  messageFromTwitter(new Tweet('leanm', 'lea_nmakers', message));
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
      context.freshTweets = context.freshTweets.filter(function(currentObject, index, arr){
        return currentObject.userName != tweet.userName && currentObject.screenName != tweet.screenName && currentObject.text != tweet.text;;
      });
     /* _
        .remove(context.freshTweets, function (currentObject) {
          return currentObject.userName === tweet.userName && currentObject.screenName === tweet.screenName && currentObject.text === tweet.text;
        });*/
    }

      // Si des tweets plus récent sont apparu, on les affiche
      if (context.freshTweets.length > 0) {
        let freshTweet = context.freshTweets[0];
        if (!context.isTweetDisplayed && context.tweetDisplayed != freshTweet) {
          context.isTweetDisplayed = true;
          clientMqtt.publish('lea/brain/arduino', JSON.stringify(freshTweet));
        }
      }

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
        clientMqtt.publish('lea/brain/arduino', JSON.stringify(historicTweet));
      }
    }
}



