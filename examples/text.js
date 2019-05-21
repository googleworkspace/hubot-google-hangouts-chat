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

module.exports = function(robot) {
  /** Replies with a list of commands. */
  robot.hear(
      /help/i,
      (res) => res.reply(
          'Try the following text commands:\n' +
          ' - \'reply\'\n' +
          ' - \'send\'\n' +
          ' - \'code\'\n' +
          ' - \'Save current space.\'\n' +
          ' - \'Message saved space: <message>\'\n'));

  /** Replies in the same thread as the received message. */
  robot.hear(
      /reply/i,
      (res) => res.reply('I am replying in the same thread.'));

  /**
   * Sends a message to the same space as the received message. If the sapce is
   * a room, the message appears in a new thread.
   */
  robot.hear(
      /send/i,
      (res) => res.send(
          'I sent this message to the same space.'));

  /** Replies with a code snippet. */
  robot.hear(
      /code/i,
      (res) => res.reply(
          'Check out this cool Javascript snippet:\n\n' +
          '```\n' +
          '// Spells GOOGLE upside-down.\n' +
          'console.log([9, 31].sort() + [0] + "null".localeCompare(null) +' +
          ' 1/0.1111111111111111);\n' +
          '```'));

  /** Saves the space name given in the message. */
  robot.hear(
      /Save current space/i,
      (res) => {
        robot.savedSpace = res.message.room;
        res.reply('Saved space: ' + robot.savedSpace);
      });

  /** Messages the saved space using the {@code robot#messageRoom} method. */
  robot.hear(
      /Message saved space: (.*)/i,
      (res) => {
        if (robot.savedSpace) {
          robot.messageRoom(robot.savedSpace, res.match[1]);
        } else {
          res.reply('There is no space saved!');
        }
      });
}

