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

const {AddedToSpaceTextMessage, AddedToSpaceMessage, RemovedFromSpaceMessage, CardClickedMessage} = require('./message');

/**
 * Adds a number of convenience functions to the robot for processing events
 * specific to Hangouts Chat.
 *
 * @param {Object} robot The robot to add functions to.
 */
const addExtensions = (robot) => {
  robot.onAddToSpace =
      (callback) =>
          robot.listen(
              (msg) => (msg instanceof AddedToSpaceTextMessage
                     || msg instanceof AddedToSpaceMessage),
              {},
              callback);

  robot.onRemoveFromSpace =
      (callback) =>
          robot.listen(
              (msg) => msg instanceof RemovedFromSpaceMessage,
              {},
              (res) => {
                callback(res);
                // Mark the message as done since no responses are expected.
                res.message.setHandled();
              });

  robot.onCardClick =
      (callback) =>
          robot.listen(
              (msg) => msg instanceof CardClickedMessage,
              {},
              callback);
}

module.exports = {addExtensions};
