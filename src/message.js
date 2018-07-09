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
