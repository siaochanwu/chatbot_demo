require('dotenv').config()
var express = require('express');
var router = express.Router();
const axios = require('axios');

const AssistantV1 = require('ibm-watson/assistant/v1');
const { IamAuthenticator } = require('ibm-watson/auth');

let context;
//connect with line
router.post('/line', async function(req, res, next) {

	console.log(JSON.stringify(req.body, null, 2))
    res.status(200).send()

    let events = req.body.events[0]

    if (events.type == 'message') {
        let replyToken = events.replyToken
        // let userId = events.source.userId
        if (events.message.type == 'text') {
            let text = events.message.text
            
            //ai判斷要回傳的內容
            let msg = await connectWatson(text, context)

            if (context == undefined) {
                context = await msg.context
            }

            await replyUser(replyToken, msg.output.text[0])
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
            return res.result
        })
        .catch(err => {
            console.log(err)
        });
}