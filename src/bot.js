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

const {Adapter, User, TextMessage} = require.main.require('hubot');
const PubSub = require(`@google-cloud/pubsub`);
const {google} = require('googleapis');
const {auth} = require('google-auth-library');
const HangoutsChatTextMessage = require('./message')
const express = require('express');
const bodyparser = require('body-parser');
const app = express()
    .use(bodyparser.urlencoded({extended: false}))
    .use(bodyparser.json());

class HangoutsChatPubsubBot extends Adapter {

  constructor(robot, options) {
    super(robot);

    this.subscriptionName = `projects/${options.projectId}/subscriptions/${options.subscriptionId}`;
    this.isPubSub = options.isPubSub;
    this.port = options.port;

    if (this.isPubSub) {
      // Establish OAuth with Hangouts Chat
      let authClientPromise = auth.getClient({
        scopes: ['https://www.googleapis.com/auth/chat.bot']
      });
      authClientPromise.then((credentials) => {
        this.chat = google.chat({
          version: 'v1',
          auth: credentials
        });
      });
    }
  }

  /*
   * Helper method which takes care of constructing the response url
   * and sending the message to Hangouts Chat.
   */
  sendMessage(envelope, ...strings) {
    let data = {
        text: strings[0] || '',
        thread: envelope.message.thread
    };

    if (this.isPubSub) {
      this.chat.spaces.messages.create({
        parent: envelope.message.space.name,
        requestBody: data
      });
    } else {
      // Post message as HTTP response
      envelope.message.httpRes.json(data);
    }
  }

  /*
   * Hubot is sending a message to Hangouts Chat.
   */
  send (envelope, ...strings) {
    this.sendMessage(envelope, ...strings);
  }

  /*
   * Hubot is sending a reply to Hangouts Chat.
   */
  reply (envelope, ...strings) {
    this.sendMessage(envelope, ...strings);
  }

  /*
   * Activates HTTP listener and sets
   * up handler to handle events.
   */
  startHttpServer() {
    // Create an event handler to handle messages.
    app.post('/', (req, res) => {
      this.onEventReceived(req.body, res);
    });
    // Listen for new messages.
    app.listen(this.port, () => {
      this.robot.logger.info(`Server is running in port - ${this.port}`);
    });
  }

  /*
   * Initializes the Cloud Pub/Sub Subscriber,
   * establishes connection to the Subscription
   * and sets up handler to handle events.
   */
  startPubSubClient() {
    const pubsub = PubSub();
    const subscription = pubsub.subscription(this.subscriptionName);
    // Create an event handler to handle messages.
    const messageHandler = (pubsubMessage) => {
      this.robot.logger.debug(`Received message ${pubsubMessage.id}:`);
      this.robot.logger.debug(`\tData: ${pubsubMessage.data}`);
      
      const dataUtf8encoded = Buffer.from(pubsubMessage.data, 'base64').toString('utf8');
      let event;
      try {
        event = JSON.parse(dataUtf8encoded);
      } catch (ex) {
        logging.warn('Bad request');
        pubsubMessage.ack();
        return;
      }

      this.onEventReceived(event, null);
      // "Ack" (acknowledge receipt of) the message.
      pubsubMessage.ack();
    };

    // Listen for new messages until timeout is hit.
    subscription.on(`message`, messageHandler);
  }


  /*
   * Invoked when Event is received from Hangouts Chat.
   */
  onEventReceived(event, res) {
    // TODO(kavimehta): Create and allow for additional message types
    if (event.type != 'MESSAGE') {
      this.robot.logger.info('Only MESSAGE event supported now !');
      return;
    }
    let message = event.message;
    let sender = message.sender;

    // Construct TextMessage and User objects in the Hubot world
    let userId = sender.name;
    let userOptions = sender;

    let user = new User(userId, userOptions);
    let hangoutsChatTextMessage = new HangoutsChatTextMessage(
      user,
      message.argumentText,
      message.name,
      message.space,
      message.thread,
      message.createTime,
      res);

    // Pass the message to the Hubot bot
    this.robot.receive(hangoutsChatTextMessage);
  }

  /*
   * This is like the main method.
   * Hubot invokes this method, when we use this adapter, to setup
   * the bridge between Hubot and Hangouts Chat
   */
  run() {
    this.robot.logger.info('Running');

    if (this.isPubSub) {
      // Connect to PubSub subscription
      this.startPubSubClient();
    } else {
      // Begin listening at HTTP endpoint
      this.startHttpServer();
    }

    // To make Hubot load scripts
    this.emit('connected')
  }

}

module.exports = HangoutsChatPubsubBot
