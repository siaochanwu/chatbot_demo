require('dotenv').config()
var express = require('express');
var router = express.Router();
const axios = require('axios');
const SimpleNodeLogger = require('simple-node-logger')

const AssistantV1 = require('ibm-watson/assistant/v1');
const { IamAuthenticator } = require('ibm-watson/auth');

let context;
//connect with line
router.post('/line', async function(req, res, next) {

	// console.log(JSON.stringify(req.body, null, 2))
    res.status(200).send()

    let events = req.body.events[0]

    if (events.type == 'message') {
        let replyToken = events.replyToken
        // let userId = events.source.userId
        if (events.message.type == 'text') {
            let text = events.message.text
            
            //ai判斷要回傳的內容
            let msg = await connectWatson(text, context)
            
            logger.log(msg.context.conversation_id + ' says:', text);

            if (msg.context) { //context包含對話進度資訊須更新
                context = msg.context
            }

            replyUser(replyToken, msg.output.text[0])
        }
    }

});

module.exports = router;

function replyUser(replyToken, msg) {
    return axios({
        method: 'post',
        url: process.env.REPLY_URL,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + process.env.CHANNEL_ACCESS_TOKEN
        },
        data: {
            "replyToken": replyToken,
            "messages":[
                {
                    type: 'text',
                    text: msg
                }
            ]
        }
      })
      .then(res => {
        console.log(res);
      })
      .catch(error => {
        console.log(error);
      });
}

function connectWatson(text, context) {
    const assistant = new AssistantV1({
        version: '2019-02-28',
        authenticator: new IamAuthenticator({
          apikey: process.env.WATSON_KEY,
        }),
        serviceUrl: process.env.WATSON_URL,
      });
    
    return assistant.message({
        workspaceId: process.env.ASSISTANT_ID,
        input: {'text': text},
        context: context
        })
        .then(res => {
            // console.log(JSON.stringify(res.result, null, 2));
            logger.log(res.result.user_id + ' return message:', res.result)
            return res.result
        })
        .catch(err => {
            logger.error(res.result.user_id + ' call watson fail:', err)
        });
}

let logger = {
    init: function(fileName) {
        const opts1 = {
            logDirectory: './logs',
            fileNamePattern: `${fileName}-<DATE>.log`,
            dateFormat: 'YYYY-MM-DD',
            timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS'
        }
        this.normalLogger = SimpleNodeLogger.createRollingFileLogger(opts1);
        const opts2 = {
            logDirectory: './logs',
            fileNamePattern: `${fileName}-<DATE>.log`,
            dateFormat: 'YYYY-MM-DD',
            timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS'
        }
        this.errorLogger = SimpleNodeLogger.createRollingFileLogger(opts2);
    },
    log: function(){
        let myLog = `${Object.values(arguments).join(' ')}`
        this.normalLogger.info(myLog)
    },
    error: function(){
        let myLog = `${Object.values(arguments).join(' ')}`
        this.errorLogger.info(myLog)
    }
}
logger.init('webhook')