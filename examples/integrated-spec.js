const dmInRoom = require('./hangouts-chat-messages/dm-in-room.json');
const addedToRoom = require('./hangouts-chat-messages/add-to-room.json');
const removedFromRoom = require('./hangouts-chat-messages/remove-from-room.json');
const {spaces} = require('./hangouts-chat-messages/spaces-list.json');
const {google} = require('googleapis');
const {auth} = require('google-auth-library');
const Path = require('path');
const ROOT = __dirname;
const Robot = require('../node_modules/hubot/src/robot.js')
const expect = require('chai').expect
const {RemovedFromSpaceMessage} = require('../src/message.js')

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

const botOptions = {
    adapterPath: ROOT,
    adapterName: "../main.js",
    enableHttpd: true,
    botName: "hubot",
    botAlias: null
};

describe('Testing with a running Hubot', () => {
    it('Help me Hubot', (done) => {
        process.env.PORT = 3000;
        const robot = new Robot(botOptions.adapterPath, botOptions.adapterName,
            botOptions.enableHttpd, botOptions.botName, botOptions.botAlias);
        robot.load(Path.resolve(ROOT, "scripts"));
        robot.run();
        dmInRoom.message.text = '@hubot help';
        let counter = 0;
        robot.adapter.chatPromise = new Promise((resolve, reject)=>{
            resolve({
                spaces: {
                    messages: {
                        create(resp){
                            let text = resp.requestBody.text;
                            counter++;
                            const found = ["Try sending",
                            "Try the following text commands",
                            "Try adding the bot to the space",
                            "I'm responding to help"].find( f => text.indexOf(f) > -1);
                            expect(found).to.be.ok;
                            if(counter == 2) {
                                robot.shutdown();
                                done();
                            }
                        }
                    }
                }
            });
        });

        robot.http(`http://localhost:${process.env.PORT}/`)
            .header('Content-Type', 'application/json')
            .post(JSON.stringify(dmInRoom))((err, res, body)=>{
                expect(res.statusCode).to.be.eql(200)
            });
    });

    it('I want to see how a card works', (done) => {
        process.env.PORT = 3001
        const robot = new Robot(botOptions.adapterPath, botOptions.adapterName,
            botOptions.enableHttpd, botOptions.botName, botOptions.botAlias);
        robot.load(Path.resolve(ROOT, "scripts"));
        robot.run();

        dmInRoom.message.text = '@hubot card';

        robot.adapter.chatPromise = new Promise((resolve, reject)=>{
            resolve({
                spaces: {
                    messages: {
                        create(resp){
                            let card = resp.requestBody.cards[0];
                            expect(card.header.title).to.eql('title');
                            expect(card.sections[0].widgets[0].buttons[0].textButton.text).to.eql('Click Me!');
                            robot.shutdown();
                            done();
                        }
                    }
                }
            })
        });

        robot.http(`http://localhost:${process.env.PORT}/`)
            .header('Content-Type', 'application/json')
            .post(JSON.stringify(dmInRoom))((err, res, body)=>{
                expect(res.statusCode).to.be.eql(200)
            });
    });

    it('Bot added to a room', (done) => {
        process.env.PORT = 3002
        const robot = new Robot(botOptions.adapterPath, botOptions.adapterName,
            botOptions.enableHttpd, botOptions.botName, botOptions.botAlias);
        robot.load(Path.resolve(ROOT, "scripts"));
        robot.run();
        robot.adapter.chatPromise = new Promise((resolve, reject)=>{
            resolve({
                spaces: {
                    messages: {
                        create(resp){
                            let text = resp.requestBody.text;
                            expect(text).to.include("Thank you for adding me to the room")
                            robot.shutdown();
                            done();
                        }
                    }
                }
            })
        })
        robot.http(`http://localhost:${process.env.PORT}/`)
            .header('Content-Type', 'application/json')
            .post(JSON.stringify(addedToRoom))((err, res, body)=>{
                expect(res.statusCode).to.be.eql(200)
            });
    });

    it('Bot removed from a room', (done) => {
        process.env.PORT = 3003
        const robot = new Robot(botOptions.adapterPath, botOptions.adapterName,
            botOptions.enableHttpd, botOptions.botName, botOptions.botAlias);
        robot.load(Path.resolve(ROOT, "scripts"));
        robot.run();
        robot.onRemoveFromSpace((resp)=>{
            expect(resp.message).to.be.an.instanceof(RemovedFromSpaceMessage)
            robot.shutdown();
            done()
        })
        robot.http(`http://localhost:${process.env.PORT}/`)
            .header('Content-Type', 'application/json')
            .post(JSON.stringify(removedFromRoom))((err, res, body)=>{
                expect(res.statusCode).to.be.eql(200)
            });
    });
});