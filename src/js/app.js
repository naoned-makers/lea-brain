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
let historicTweets = [];

// le pool de traitement {fct: "fonction lancée pour chaque record", args: "arguments passés à la fonction"}
var pool = [];
// les records en sortie
var objectsResult = [];

const UI_TO_BRAIN_CHANNEL = 'lea/ui/brain';
const TWITTER_TO_BRAIN_CHANNEL = 'lea/twitter/brain';
const ARDUINO_TO_BRAIN_CHANNEL = 'lea/arduino/brain';
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
    let tweet = new Tweet('', '', Configuration.TEXT_LEA_START_UP);
    tweet.isHistorized = false;
    messageFromTwitter(tweet);
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
      logger.log('debug', "On reçoit un message de l'ARDUINO");
      messageFromArduino(JSON.parse(strPayload.toString()))
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


  pool.push({
    fct:
    function(objElt) {
      clientMqtt.publish(BRAIN_TO_ARDUINO_CHANNEL, JSON.stringify(tweet), optionsMqtt);
      setTimeout(() => {
        logger.log('info', "Le tweet a bien été envoyé");
        console.log("Dans " + process.hrtime());
      }, 10000);
    },
    args: [tweet]});



  pool.push({fct: () => {
    console.log("finish batch");
  }});

  execPool();
}

function execPool() {
  console.log(pool.length);
  console.log(!context.isTweetDisplayed);
  console.log(!context.tweetDisplayed.fresh);
  if (pool && pool.length > 0){// && (!context.isTweetDisplayed || !context.tweetDisplayed.fresh)) {
      //setImmediate(() => {
          let poolElt =  pool.shift();
          if (poolElt.args) poolElt.fct(...poolElt.args);
          else poolElt.fct();
          execPool();
      //});
  }
}


function messageFromUI(message) {
  messageFromTwitter(new Tweet(Configuration.TWITTER_USER_NAME, Configuration.USER_TWITTER, message));
}

let firstTime = true;
function messageFromArduino(message) {
    context.isTweetDisplayed = false;
    let tweet = message.tweet;
    console.log(tweet.isHistorized);

    if (message.action == Configuration.processConst.ACTION.END_SHOW_TWEET_ON_ARDUINO) {
      Utils.saveTweet(tweet);

      // On tansforme le tweet récemment affiché en tweet historisé
      if (tweet.fresh && tweet.isHistorized) {
        tweet.isHistorized = false;
        tweet.fresh = false;
        tweet.motion = null;
        objectsResult.push(tweet);
      }
    }

    // Si des tweets plus récent sont apparu, on les affiche
    if (!context.isTweetDisplayed) {
      // Si la liste des tweets historique est plus grande, le progamme la tronque
      if (historicTweets.length > 10) {
        historicTweets = historicTweets.slice(0, 10);
      }
      if (objectsResult.length > 10) {
        objectsResult = objectsResult.slice(0, 10);
      }
      // Si il existe des tweets historique, le programme les affiche de manière aléatoire
      if (firstTime) {
        if (objectsResult.length > 0) {
          var timer_id=setInterval(function(){
            console.log(objectsResult);
            let currentTweet = objectsResult[Utils.getRandomInt(0, objectsResult.length - 1)];
            console.log("TWEET HISTORIQUE " + currentTweet);
            clientMqtt.publish(BRAIN_TO_ARDUINO_CHANNEL, JSON.stringify(currentTweet), optionsMqtt);
          },10000);
        }
        firstTime = false;
      }
    }
}



