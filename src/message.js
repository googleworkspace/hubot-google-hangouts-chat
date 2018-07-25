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

var {TextMessage} = require.main.require('hubot');

class HangoutsChatTextMessage extends TextMessage {

    /**
     * @param {user} user The user who sent this message; required by Hubot.
     * @param {text} text The parsed message text; required by Hubot.
     * @param {id} id The identifier for this message; required by Hubot.
     * @param {space} space The Hangouts Chat space from which this message was sent.
     * @param {thread} thread The Hangouts Chat thread that this message is a part of.
     * @param {createTime} createTime The time at which this message was created.
     * @param {httpRes} httpRes The HTTP response object for sending back HTTP replies; is null for PubSub bots.
     */
    constructor(user, text, id, space, thread, createTime, httpRes) {
        super(user, text, id);
        this.space = space;
        this.thread = thread;
        this.createTime = createTime;
        this.httpRes = httpRes;
    }
}

module.exports = HangoutsChatTextMessage
