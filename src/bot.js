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

const {Adapter, User, TextMessage} = require.main.require('hubot/es2015');
const PubSub = require(`@google-cloud/pubsub`);
const {google} = require('googleapis');
const {auth} = require('google-auth-library');
const HangoutsChatTextMessage = require('./message')
const express = require('express');
const bodyparser = require('body-parser');
const app = express()
    .use(bodyparser.urlencoded({extended: false}))
    .use(bodyparser.json());

class HangoutsChatBot extends Adapter {

  constructor(robot, options) {
    super(robot);

    this.subscriptionName =
        `projects/${options.projectId}/subscriptions/${options.subscriptionId}`;
    this.isPubSub = options.isPubSub;
    this.port = options.port;

    // Establish OAuth with Hangouts Chat. This is required for PubSub bots and
    // HTTP bots which want to create async messages.
    let authClientPromise = auth.getClient({
      scopes: ['https://www.googleapis.com/auth/chat.bot']
    });
    this.chatPromise = authClientPromise.then((credentials) =>
      google.chat({
        version: 'v1',
        auth: credentials
      })).catch((err) =>
        robot.logger.warning("Hangouts Chat Authentication Failed! This may " +
          "cause message creation to fail. Please provide the credentials " +
          "for your service account.\n" + err));
  }

  /**
   * Helper method which takes care of constructing the response url
   * and sending the message to Hangouts Chat.
   *
   * This method has different behavior based on the type of envelope passed in.
   * <ul>
   *   <li>If the envelope has a message, it responds to the message. For HTTP
   *       bots, an HTTP response is sent.
   *   <li>If the envelope does not have a message, it must have the room
   *       parameter set to the name of a space. The bot will use the REST API
   *       to post a message in the space.
   * </ul>
   * @param {Object} envelope An Object with message, room, and user details.
   * @param {string} text The message text.
   */
  sendMessage_(envelope, text = '') {
    let hasMessage = !!envelope.message;
    if (!hasMessage && !envelope.room) {
      throw new Error("When sending a message, the envelope must have either " +
          "a message or a room.");
    }

    let spaceName = hasMessage ? envelope.message.space.name : envelope.room;
    let data = {
      space: {
        name: spaceName,
      },
      text,
    };
    if (hasMessage) {
      data.thread = envelope.message.thread;
    }

    this.robot.logger.info("Sending a message to space: " + spaceName);
    if (hasMessage && envelope.message.httpRes) {
      envelope.message.httpRes.json(data);
    } else {
      this.createMessageUsingRestApi_(spaceName, data);
    }
  }

  /** Hubot is sending a message to Hangouts Chat. */
  send(envelope, ...strings) {
    this.sendMessage_(envelope, strings[0] || '');
  }

  /** Hubot is sending a reply to Hangouts Chat. */
  reply(envelope, ...strings) {
    this.sendMessage_(envelope, strings[0] || '');
  }

  /**
   * Helper method for creating a message using the Hangouts Chat REST API.
   * @param {string} space The space in which the message should be created.
   * @param {Object} message The Message REST resource that should be added.
   */
  createMessageUsingRestApi_(space, message) {
    this.chatPromise.then((chat) =>
        chat.spaces.messages.create({
            parent: space,
            requestBody: message
        }))
        .catch((err) =>
            this.robot.logger.error("Message creation failed. This may be " +
                "due to missing service account credentials.", err));
  }

  /** Activates HTTP listener and sets up handler to handle events. */
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

  /**
   * Initializes the Cloud Pub/Sub Subscriber, establishes connection to the
   * Subscription and sets up handler to handle events.
   */
  startPubSubClient() {
    const pubsub = PubSub();
    this.robot.logger.info(
        `Connecting to Pub/Sub subscription - ${this.subscriptionName}`);
    const subscription = pubsub.subscription(this.subscriptionName);
    // Create an event handler to handle messages.
    const messageHandler = (pubsubMessage) => {
      this.robot.logger.debug(`Received message ${pubsubMessage.id}:`);
      this.robot.logger.debug(`\tData: ${pubsubMessage.data}`);

      const dataUtf8encoded =
          Buffer.from(pubsubMessage.data, 'base64').toString('utf8');
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


  /** Invoked when Event is received from Hangouts Chat. */
  onEventReceived(event, res) {
    // TODO(kavimehta): Create and allow for additional message types
    if (event.type != 'MESSAGE') {
      this.robot.logger.info('Only MESSAGE event supported now !');
      this.robot.logger.info(event);
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

  /**
   * Sets up adapter for communicating with Hangouts Chat. Hubot invokes this
   * message during initialization.
   */
  run() {
    if (this.isPubSub) {
      // Connect to PubSub subscription
      this.startPubSubClient();
    } else {
      // Begin listening at HTTP endpoint
      this.startHttpServer();
    }

    this.robot.logger.info('Hangouts Chat adapter initialized successfully');
    // To make Hubot load scripts
    this.emit('connected')
  }
}

module.exports = HangoutsChatBot
