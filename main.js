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

HangoutsChatBot = require('./src/bot')

module.exports = {
  use(robot) {
    let options = {
      isPubSub: process.env.IS_PUBSUB ? true : false,
      /* Pub/Sub options */
      projectId: process.env.PUBSUB_PROJECT_ID,
      subscriptionId: process.env.PUBSUB_SUBSCRIPTION_ID,
      /* HTTP options */
      port: process.env.PORT || 8080
    };
    return new HangoutsChatBot(robot, options);
  }
};
