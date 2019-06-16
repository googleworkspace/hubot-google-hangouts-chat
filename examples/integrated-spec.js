const dmInRoom = require('./messages-from-gchat/dm-in-room.json');
const {spaces} = require('./messages-from-gchat/spaces-list.json');
const {google} = require('googleapis');
const {auth} = require('google-auth-library');
const Path = require('path');
const ROOT = __dirname;
const Robot = require('../node_modules/hubot/src/robot.js')
const Response = require('../node_modules/hubot/src/response.js')
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
    enableHttpd: true,
    botName: "hubot",
    botAlias: null
};

const robot = new Robot(botOptions.adapterPath, botOptions.adapterName,
    botOptions.enableHttpd, botOptions.botName, botOptions.botAlias);

describe('Testing with a running Hubot', () => {
    it('Help me Hubot', () => {
        dmInRoom.message.text = '@hubot help';
        let counter = 0
        let oldReply = robot.adapter.reply
        robot.adapter.reply = (envelope, resp)=>{
            counter++
            const found = ["Try sending",
            "Try the following text commands",
            "Try adding the bot to the space"].find( f => resp.indexOf(f) > -1)
            expect(found).to.be.ok
            if(counter == 2) {
                robot.adapter.reply = oldReply
            }
        }
        robot.load(Path.resolve(ROOT, "scripts"));
        robot.run();
        robot.http(`http://localhost:${port}/`)
            .header('Content-Type', 'application/json')
            .post(JSON.stringify(dmInRoom))((err, res, body)=>{
                expect(body).to.eql('');
            });
    })

    it('I want to see how a card works', () => {
        dmInRoom.message.text = '@hubot card';
        let oldReply = robot.adapter.reply
        robot.adapter.reply = (envelope, resp, body)=>{
            const obj = JSON.parse(body)[0]
            expect(obj.header.title).to.eql('title')
            expect(obj.sections[0].widgets[0].buttons[0].textButton.text).to.eql('Click Me!')
            robot.adapter.reply = oldReply
        }
        robot.load(Path.resolve(ROOT, "scripts"));
        robot.run();
        robot.http(`http://localhost:${port}/`)
            .header('Content-Type', 'application/json')
            .post(JSON.stringify(dmInRoom))((err, res, body)=>{
                expect(body).to.eql('');
            });
    })

})

after(done => {
    robot.shutdown()
    done()
})
