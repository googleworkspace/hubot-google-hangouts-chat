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

const {User, Message, TextMessage} = require.main.require('hubot/es2015');

/**
 * A message from Hangouts Chat which represents a MESSAGE event, i.e. a user
 * messaging the bot.
 */
class HangoutsChatTextMessage extends TextMessage {

  /**
   * @param {User} user The user who sent this message; required by Hubot.
   * @param {string} text The parsed message text; required by Hubot.
   * @param {string} id The identifier for this message; required by Hubot.
   * @param {Object} space The Hangouts Chat space from which this message was
   *     sent.
   * @param {Object} thread The Hangouts Chat thread that this message is in.
   * @param {string} eventTime The time at which the event was created.
   * @param {Object} httpRes The HTTP response object for sending back HTTP
   *    replies; is null for PubSub bots.
   */
  constructor(user, text, id, space, thread, eventTime, httpRes) {
    super(user, text, id);
    this.space = space;
    this.thread = thread;
    this.eventTime = eventTime;
    this.httpRes = httpRes;
    this.handled = false;
  }

  /**
   * Marks the message as handled, which HTTP bots use a signal that an HTTP
   * response must be sent.
   */
  setHandled() {
    this.handled = true;
  }
}

/**
 * A message representing an ADDED_TO_SPACE event that contains a message. This
 * can happen when a user adds a bot by @mentioning them.
 */
class AddedToSpaceTextMessage extends HangoutsChatTextMessage {}

/**
 * A message from Hangouts Chat that does not have an accompanying user message.
 */
class HangoutsChatMessage extends Message {

  /**
   * @param {User} user The user who sent this message; required by Hubot.
   * @param {Object} space The Hangouts Chat space from which this message was
   *     sent.
   * @param {string} eventTime The time at which the event was created.
   * @param {Object} httpRes The HTTP response object for sending back HTTP
   *     replies; is null for PubSub bots.
   */
  constructor(user, space, eventTime, httpRes) {
    super(user);
    this.space = space;
    this.eventTime = eventTime;
    this.httpRes = httpRes;
    this.handled = false;
  }

  /**
   * Marks the message as handled, which HTTP bots use a signal that an HTTP
   * response must be sent.
   */
  setHandled() {
    this.handled = true;
  }
}

/** Represents an ADDED_TO_SPACE event. */
class AddedToSpaceMessage extends HangoutsChatMessage {}

/** Represents a REMOVED_FROM_SPACE event. */
class RemovedFromSpaceMessage extends HangoutsChatMessage {}

/** Represents a CARD_CLICKED event. */
class CardClickedMessage extends HangoutsChatMessage {

  /**
   * @param {User} user The user who sent this message; required by Hubot.
   * @param {Object} space The Hangouts Chat space from which this message was
   *     sent.
   * @param {string} eventTime The time at which the event was created.
   * @param {Object} httpRes The HTTP response object for sending back HTTP
   *     replies; is null for PubSub bots.
   * @param {Object} thread The Hangouts Chat thread that the card is in.
   * @param {string} actionMethodName The method name that should be invoked as
   *     a result of this card click.
   * @param {Array<Object>} parameters An array of key/value pairs representing
   *     the parameters passed into the method.
   */
  constructor(
      user, space, eventTime, httpRes, thread, actionMethodName, parameters) {
    super(user, space, eventTime, httpRes);
    this.thread = thread;
    this.actionMethodName = actionMethodName;
    this.parameters = parameters;
  }
}

module.exports = {
  HangoutsChatTextMessage,
  AddedToSpaceTextMessage,
  AddedToSpaceMessage,
  RemovedFromSpaceMessage,
  CardClickedMessage,
};
