import Configuration from "../config/configuration";
import {getRandomInt} from "./utils";

import fs from 'fs';
import logger from "../helpers/log";

// Audio
//import lame from 'lame';
//import Speaker from 'speaker';
//import StreamPlayer from 'stream-player';

export const chooseSound = (tweet) => {
  let result = Configuration
    .easterEggs
    .find(function(sound) {
      return tweet
        .text
        .startsWith(sound.text) || tweet
        .text
        .startsWith(sound.alternativeText);
    });

  if (!result) {
    // On n'a pas trouvé de son "spécial easter egg" Il faut du coup choisir un son au hasard
    let indice = getRandomInt(0, Configuration.sounds.length - 1);
    result = Configuration.sounds[indice].mp3;
  } else {
    result = result.mp3;
  }
  return result;
}

export const playSound = (file) => {
  console.log('je joue le son ', file);
  var exec = require('child_process').exec;
  let soundFile = './assets/sounds/' + file + '.mp3';
  exec("omxplayer --adev alsa " + soundFile); 
}

