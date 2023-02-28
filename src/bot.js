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

const {Adapter, User, TextMessage} = require.main.require('hubot/es2015');
const {PubSub} = require(`@google-cloud/pubsub`);
const {google} = require('googleapis');
const {auth} = require('google-auth-library');
const {HangoutsChatTextMessage, AddedToSpaceTextMessage, AddedToSpaceMessage, RemovedFromSpaceMessage, CardClickedMessage} = require('./message')

class HangoutsChatBot extends Adapter {

  constructor(robot, options) {
    super(robot);

    this.subscriptionName = `projects/${options.projectId}/subscriptions/${options.subscriptionId}`;
    this.isPubSub = options.isPubSub;
    this.port = options.port;

    let google_auth_params = {}

    if(process.env.GOOGLE_APPLICATION_CREDENTIALS_DATA) {
       // Handle json file as a environement variable for Heroku like systems
       google_auth_params = {
           credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_DATA)
       }
     }

    // Establish OAuth with Hangouts Chat. This is required for PubSub bots and
    // HTTP bots which want to create async messages.
    const authClientPromise = auth.getClient({
      scopes: ['https://www.googleapis.com/auth/chat.bot'],
      ...google_auth_params
    });
    this.chatPromise = authClientPromise.then((credentials) =>
      google.chat({
        version: 'v1',
        auth: credentials,
      })).catch((err) =>
        robot.logger.warning(`Hangouts Chat Authentication Failed! If you want to reply asynchronously, you'll need to setup a service account. ${err}`));
  }

  /**
   * Helper method which takes care of constructing the response url
   * and sending the message to Hangouts Chat. One of the text or card string
   * should be populated.
   *
   * @param {string} space The space in which to post the message
   * @param {Object=} thread The thread in which to post the message. If absent,
   *     the message will be posted in a new thread..
   * @param {string=} text The message text.
   * @param {string=} card The message card JSON string.
   */
  postMessage_(
      space,
      thread = undefined,
      text = '',
      cardString = '[]') {
    if (text == '' && cardString == '[]') {
      throw new Error('You cannot send an empty message.');
    }
    const data = this.mapToHangoutsChatResponse(space, text, cardString, thread);
    this.robot.logger.info('Sending a message to space: ' + space);
    this.createMessageUsingRestApi_(space, data);
  }

  mapToHangoutsChatResponse(space, text, cardString = '[]', thread) {
    let data = {
      space: {
        name: space,
      },
      text,
      cards: JSON.parse(cardString),
    };
    if (thread) {
      data.thread = thread;
    }
    return data;
  }

  /**
   * Sends a message to a space in Hangouts Chat.
   *
   * @param {Object} envelope An Object with a message or a room.
   * @param {Array<String>} strings The message details.
   *     <ul>
   *       <li>The first element will be used for the message text.
   *       <li>The second element will be used for the message card.
   *     </ul>
   */
  send(envelope, ...strings) {
    this.postMessage_(
        this.getSpaceFromEnvelope_(envelope),
        undefined,
        strings[0],
        strings[1]);
  }
  /**
   * Replies to a message in Hangouts Chat. If the space is a room, the message
   * is posted in the same thread as the message specified in the envelope.
   *
   * @param {Object} envelope An Object with a message.
   * @param {Array<String>} strings The message details.
   *     <ul>
   *       <li>The first element will be used for the message text.
   *       <li>The second element will be used for the message card.
   *     </ul>
   */
  reply(envelope, ...strings) {
    if (!envelope.message) {
      throw new Error('When sending a reply, the envelope must contain a message');
    }
    const thread = envelope.message.thread;
    const text = strings[0];
    const cardString = strings[1];
    this.postMessage_(
      this.getSpaceFromEnvelope_(envelope),
      thread,
      text,
      cardString);
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
   * Creates a message using the Hangouts Chat REST API.
   * @param {string} space The space in which the message should be created.
   * @param {Object} message The Message REST resource that should be added.
   */
  createMessageUsingRestApi_(space, message) {
    this.chatPromise.then(chat => {
      chat.spaces.messages.create({
        parent: space,
        requestBody: message
      });
    }).catch((err) => this.robot.logger.error('Message creation failed.', err));
  }

  /**
   * Initializes the Cloud Pub/Sub Subscriber, establishes connection to the
   * Subscription and sets up handler to handle events.
   */
  startPubSubClient() {
    const pubsub = new PubSub();
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
  onEventReceived(event, res, done = ()=>{}) {
    const message = event.message;
    const space = event.space;
    let user = new User(event.user.name, event.user);
    // This is the room value used in the Message constructor. Added for
    // compatibility with Hubot's API.
    user.room = space.name;
    const eventTime = event.eventTime;

    let hangoutsChatMessage;
    switch(event.type) {
      case 'ADDED_TO_SPACE':
        hangoutsChatMessage =
            message
                ? new AddedToSpaceTextMessage(
                    user,
                    // For empty @mention's, text is undefined.
                    message.text || '',
                    message.name,
                    space,
                    message.thread,
                    eventTime,
                    res)
                :   new AddedToSpaceMessage(user, space, eventTime, res);
        break;
      case 'REMOVED_FROM_SPACE':
        hangoutsChatMessage =
            new RemovedFromSpaceMessage(user, space, eventTime, res);
        break;
      case 'MESSAGE':
        hangoutsChatMessage = new HangoutsChatTextMessage(
          user,
          // For empty @mention's, text is undefined.
          message.text || '',
          message.name,
          space,
          message.thread,
          eventTime,
          res);
        break;
      case 'CARD_CLICKED':
        hangoutsChatMessage =
            new CardClickedMessage(
                user,
                space,
                eventTime,
                res,
                message.thread,
                event.action.actionMethodName,
                event.action.parameters);
        break;
      default:
        this.robot.logger.error('Unrecognized event type: ' + event.type);
        return;
    }
    this.robot.receive(hangoutsChatMessage, ()=>{
      done();
    });
  }

  /**
   * Sets up adapter for communicating with Hangouts Chat. Hubot invokes this
   * message during initialization. Need to always respond otherwise you'll see the
   * "hubot is not responding" message in chat.
   */
  run() {
    if (this.isPubSub) {
      // Connect to PubSub subscription
      this.startPubSubClient();
    } else {
      this.robot.router.post('/', (req, res) => {
        this.onEventReceived(req.body, res, () => {
          res.status(200).end();
        });
      });
    }

    this.robot.logger.info('Hangouts Chat adapter initialized successfully');
    // To make Hubot load scripts
    this.emit('connected')
  }
}

module.exports = HangoutsChatBot
