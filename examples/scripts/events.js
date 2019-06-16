// Description:
//   a bot to test this adapter
//
// Dependencies:
//
// Configuration:
//
// Commands:
//   hubot help - Replies with instructions on how to use this script
//
// Notes:
//
// Author:
//   joeyguerra

/**
 * Copyright 2018 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 
'use strict'

let spaceCount = 0;

module.exports = function(robot) {
  robot.hear(
      /help/i,
      (res) => res.reply(`Try adding the bot to the space directly or through an @mention. Also, try removing and re-adding the bot to the room`));

  /** Replies to the ADDED_TO_SPACE event. */
  robot.onAddToSpace(
      (res) => {
        spaceCount++;
        res.reply(
            `Thank you for adding me to the room ${res.message.text ? ' using an @mention! ' : '! '} I am now a member of ${spaceCount} spaces.`);
      });

  /**
   * Notes the REMOVED_FROM_SPACE event. A bot cannot respond when it has been
   * removed.
   */
  robot.onRemoveFromSpace((res) => spaceCount--);
}

