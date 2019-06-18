// Description:
//   a bot to test this adapter
//
// Dependencies:
//
// Configuration:
//
// Commands:
//   hubot card - Replies in the same thread as the received message
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

module.exports = function(robot) {
  robot.hear(
      /help/i,
      (res) => res.reply("Try sending 'card' to see a card example."));
      
  robot.respond(/help/i, res => {
    res.reply("I'm responding to help");
  });

  robot.hear(
      /card/i,
      (res) => res.reply(
          '',
          JSON.stringify([{
            header: {title: "title"},
            sections: [{
                widgets: [{
                    buttons: [{
                        textButton: {
                          text: "Click Me!",
                          onClick: {
                            action: {
                              actionMethodName: "click",
                              parameters: [{
                                key: "key",
                                value: "value"
                              }]
                            }
                          }
                        }
                    }]
                }]
            }]
          }])));

  /** Replies to a user clicking on a card. */
  robot.onCardClick(
      (res) =>
          res.reply(
              `${res.message.user.id} clicked on a card with method name
               ${res.message.actionMethodName}
               and parameters
               ${JSON.stringify(res.message.parameters)}`));
}

