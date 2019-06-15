const dmInRoom = require('./messages-from-gchat/dm-in-room.json');
const {spaces} = require('./messages-from-gchat/spaces-list.json');
const {google} = require('googleapis');
const {auth} = require('google-auth-library');
const Path = require('path');
const ROOT = Path.resolve(__dirname, '../../')
const Robot = require('../node_modules/hubot/src/robot.js')
const expect = require('chai').expect

google.chat = options => {
    return {
        spaces: {
            messages: {
                create(message){
                    process.emit("message created", message);
                }
            },
            list(){
                return {
                    data: {
                        spaces: spaces
                    }
                }
            }
        }
    }
};

auth.getClient = options => {
    return Promise.resolve();
};

Robot.prototype.loadAdapter = function(adapter) {
    try {
        this.adapter = require(adapter).use(this);
    } catch (err) {
        console.error(`Cannot load adapter ${adapter} - ${err}`);
        process.exit(1);
    }
}
const port = process.env.PORT || 8080;
const botOptions = {
    adapterPath: ROOT,
    adapterName: "../main.js",
    enableHttpd: false,
    botName: "hubot",
    botAlias: null
};

const robot = new Robot(botOptions.adapterPath, botOptions.adapterName,
    botOptions.enableHttpd, botOptions.botName, botOptions.botAlias);

describe('Testing with running Hubot', () => {
    it('Help me Hubot', done => {
        dmInRoom.message.text = '@hubot help';
        const expected = '';
        const oldReply = robot.adapter.reply;
        robot.adapter.reply = (envelope, resp)=>{
            expect(resp).to.eql(expected);
            robot.adapter.reply = oldReply;
            done();
        };
        robot.load(Path.resolve(ROOT, "./"));
        robot.run();
        robot.http(`http://localhost:${port}/`)
            .header("Content-Type", "application/json")
            .post(JSON.stringify(dmInRoom))((err, res, body)=>{
                expect(body).to.eql("OK");
            });
    })
})

after(done => {
    robot.shutdown()
    done()
})
