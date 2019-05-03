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
    const authClientPromise = auth.getClient({
      scopes: ['https://www.googleapis.com/auth/chat.bot']
    });
    this.chatPromise = authClientPromise.then((credentials) =>
      google.chat({
        version: 'v1',
        auth: credentials
      })).catch((err) =>
        robot.logger.error(
            'Hangouts Chat Authentication Failed! Please provide the ' +
            'credentials for your service account.\n' + err));
  }

  /**
   * Helper method which takes care of constructing the response url
   * and sending the message to Hangouts Chat. One of the text or card string
   * should be populated.
   *
   * @param {string} space The space in which to post the message
   * @param {string=} thread The thread in which to post the message. If absent,
   *    the message will be posted in a new thread.
   * @param {string=} text The message text.
   * @param {string=} card The message card JSON string.
   * @param {Object=} httpRes The HTTP response for the request.
   */
  postMessage_(
      space, thread = '', text = '', cardString = '[]', httpRes = undefined) {
    if (text == '' && cardString == '[]') {
      throw new Error('You cannot send an empty message.');
    }

    let data = {
      space: {
        name: space,
      },
      text,
      cards: JSON.parse(cardString)
    };

    if (thread != '') {
      data.thread = thread;
      this.robot.logger.info('Replying to a message to space: ' + space);
      if (httpRes) {
        httpRes.json(data);
      } else {
        this.createMessageUsingRestApi_(space, data);
      }
    } else {
      this.robot.logger.info('Sending a message to space: ' + space);
      this.createMessageUsingRestApi_(space, data);
      if (httpRes) {
        httpRes.sendStatus(200);
      }
    }
  }

  /**
   * Sends a message to a space in Hangouts Chat.
   *
   * @param {Object} envelope An Object with a message or a room.
   * @param {Array<String>} strings The message details. The first element will
   *    be used for the message text and the second element will be used for the
   *    message card. Empty strings will be ignored.
   */
  send(envelope, ...strings) {
    this.postMessage_(
        this.getSpaceFromEnvelope_(envelope),
        '',
        strings[0],
        strings[1],
        this.getOptHttpResFromEnvelope_(envelope));
  }

  /**
   * Replies to a message in Hangouts Chat. If the space is a room, the message
   * is posted in the same thread as the message specified in the envelope.
   *
   * @param {Object} envelope An Object with a message.
   * @param {Array<String>} strings The message details. The first element will
   *    be used for the message text and the second element will be used for the
   *    message card. Empty strings will be ignored.
   */
  reply(envelope, ...strings) {
    if (!envelope.message) {
      throw new Error(
          'When sending a reply, the envelope must contain a message');
    }
    this.postMessage_(
        this.getSpaceFromEnvelope_(envelope),
        envelope.message.thread,
        strings[0],
        strings[1],
        this.getOptHttpResFromEnvelope_(envelope));
  }

  /**
   * Gets the space name from the envelope object. The envelope must have either
   * a message or a room. If it has both, the message is used.
   *
   * @param {Object} envelope An object with a message or room.
   * @return {string} The space name.
   */
  getSpaceFromEnvelope_(envelope) {
    if (envelope.message) {
      return envelope.message.space.name;
    }

    if (envelope.room) {
      return envelope.room;
    }

    throw new Error('When sending a message, the envelope must have either ' +
        'a message or a room.');
  }

  /**
   * Returns the HTTP response object from the envelope message if it is
   * present.
   *
   * @param {Object} envelope An object with an optional httpRes object.
   * @return {Object} The HTTP response or null.
   */
  getOptHttpResFromEnvelope_(envelope) {
    return envelope.message ? envelope.message.httpRes : null;
  }

  /**
   * Creates a message using the Hangouts Chat REST API.
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
            this.robot.logger.error('Message creation failed.', err));
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
      // 'Ack' (acknowledge receipt of) the message.
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
    const message = event.message;
    const sender = message.sender;

    // Construct TextMessage and User objects in the Hubot world
    const userId = sender.name;
    const userOptions = sender;

    const user = new User(userId, userOptions);
    const hangoutsChatTextMessage = new HangoutsChatTextMessage(
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
