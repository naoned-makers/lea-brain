"use strict";

import fs from 'fs';
import logger from "../helpers/log";

// Le modèle Tweet
import Tweet from "../models/tweet";

import Configuration from "../config/configuration";
import { playSound } from './sound';

/**
 * Renvoie un nombre aléatoire compris entre le min et le max.
 *
 * @param min le nombre minimum
 * @param max le nombre maximum
 * @returns {*} un nombre alétoire
 */
export const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Renvoie une commande aléatoire.
 * @returns {*} une commande aléatoire
 */
export const getRandomMotion = (sound) => {
  let result = Configuration
    .easterEggs
    .find(function (easterEgg) {
      return sound == easterEgg.mp3;
    });

  if (result && result.motion) {
    return result.motion;
  } else if (getRandomInt(0, 9) % 2 == 0) {
    return Configuration.CLASSIC_MOTIONS[0];
  } else {
    return Configuration.CLASSIC_MOTIONS[1];
  }
};

/*
  UTILITAIRES EN RAPPORT AVEC LES FICHIERS
   */


/**
 * Sauvegarde le tweet courant.
 */
export const saveTweet = (tweet) => {
  if (tweet.fresh) {
    let configFile = fs.readFileSync(Configuration.TWEETS_DB);
    let config = JSON.parse(configFile);
    config.push(tweet);
    let configJSON = JSON.stringify(config);
    logger.log('info', 'Sauvegarde du tweet courant');
    fs.writeFileSync(Configuration.TWEETS_DB, configJSON);
  }
};

export const isAdmin = (name) => Configuration
  .ADMINS
  .indexOf(name.toLowerCase()) != -1;



/**
 * Génère et renvoie un squelette de tweet
 * @returns {Tweet}
 */
export const generateTweet = (text) => {
  let tweet = new Tweet("", "", text);
  tweet.motion = "NO_MOTION";
  return tweet;
};

/**
 * Génère et renvoie un tweet indiquant que Léa est prête à jouer
 * @returns {Tweet}
 */
export const generateStartUpTweet = () => {
  logger.log('debug', 'Je génére un tweet d\'initialisation');
  return generateTweet(Configuration.TEXT_LEA_START_UP);
};

/**
 * Génère et renvoie un tweet indiquant que Léa est prête à jouer
 * @returns {Tweet}
 */
export const generateStartTweet = () => {
  logger.log('debug', 'Je génére un tweet de démarrage');
  return generateTweet(Configuration.TEXT_LEA_START);
};
