const express = require('express')
const router = express.Router()
const http = require('http')
const superagent = require('superagent')
const request = require('request')
const spider = require('./spider')
const cheerio = require('cheerio')

router.post('/test', (req, Res) => {
  console.log('get asd')
  const {username, pwd0} = req.body
  const login_url =
      'http://authserver.csuft.edu.cn/authserver/login?service=http%3A%2F%2Fjwgl.csuft.edu.cn%2F'

  const headers = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cache-Control': 'max-age=0',
    Connection: 'keep-alive',
    'Content-Length': '278',
    'Content-Type': 'application/x-www-form-urlencoded',
    Host: 'authserver.csuft.edu.cn',
    Origin: 'http://authserver.csuft.edu.cn',
    Referer: 'http://authserver.csuft.edu.cn/authserver/login?service=http%3A%2F%2Fjwgl.csuft.edu.cn%2F',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36',
  }

  superagent
      .get('http://jwgl.csuft.edu.cn/')
      .set(headers)
      .then((r) => {
        superagent
            .get('http://authserver.csuft.edu.cn/authserver/login?service=http%3A%2F%2Fjwgl.csuft.edu.cn%2F')
            .then((html) => {
              let wlan = /(LT-.*cas)/g
              let wlan2 = /pwdDefaultEncryptSalt = "(.*)";/g
              let pwdDefaultEncryptSalt = String(html.text)
                  .match(wlan2)[0]
                  .slice(25, -2)
              let r = String(html.text).match(wlan)
              let lt = r[0]
              let pwd = spider.encryptAES(pwd0, pwdDefaultEncryptSalt)
              pwd = encodeURIComponent(pwd)
              let data = `username=${username}&password=${pwd}&lt=${lt}&dllt=userNamePasswordLogin&execution=e1s1&_eventId=submit&rmShown=1`
              let headers = {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'zh,zh-TW;q=0.9,en-US;q=0.8,en;q=0.7,zh-CN;q=0.6,ru;q=0.5',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(data, 'utf-8'),
                'Cache-Control': 'max-age=0',
                'Origin': 'http://authserver.csuft.edu.cn',
                'Upgrade-Insecure-Requests': 1,
                'Proxy-Connection': 'keep-alive',
                'Host': 'authserver.csuft.edu.cn',
                'Referer': 'http://authserver.csuft.edu.cn/authserver/login',
                'Cookie': html.headers['set-cookie'][0] + ';' + html.headers['set-cookie'][1]
              }
              console.log(headers['Cookie'])
              Buffer.byteLength(data, 'utf-8')
              request({
                url: login_url,
                method: "POST",
                json: true,
                headers: headers,
                body: data
              }, (er, res, body) => {
                /*console.log(res)*/
                let newUrl = res.caseless.dict.location
                // console.log(newUrl)
                request({
                  url: newUrl,
                  method: 'GET'
                }, (er, res, body) => {
                  if(er){
					return Res.send({errMsg: 'error'})
				  }

                  http.get(res.request.headers.referer, data => {
                    let jss = data.rawHeaders[3].split(';')[0] + '; ' + data.rawHeaders[13].split(';')[0]
                    request({
                      url: 'http://jwgl.csuft.edu.cn/jsxsd/xxwcqk/xxwcqk_byxfqkcx.do',
                      method: 'GET',
                      headers: {
                        'Cookie': jss
                      },
                      gzip: true
                    }, (er, res, body) => {
                      console.log(body)
                      const $ = cheerio.load(body)

                      let num = 0
                      let position = 0
                      let flag = 0
                      let obj = new Object()
                      let lastList = []
                      let name = ['listNum','time', 'classNum', 'className', 'credit', 'grade', 'studyStatus']

                      let list = $('td')
                      list = list.slice(8)
                      list.each(function (index, ele) {
                        if($(this).text().indexOf('公共选修课修读情况') === -1){
                          if(!flag){
                            let property = name[num]
                            obj[property] = $(ele).text()
                            num++
                            if(num >= 7){
                              lastList.push(obj)
                              num = 0
                              obj = {}
                              position++
                            }
                          }else{
                            let property = name[num]
                            obj[property] = $(ele).text()
                            num++
                            if(num >= 6){
                              lastList.push(obj)
                              num = 0
                              obj = {}
                            }
                          }
                        }else{
                          flag = 1
                        }
                      })
                      Res.send({lastList, position})

                    })
                  })

                })

              })

            })
            .catch((r) => {
              console.log(r)
            })
      })
      .catch(r => {
        console.log(r)
      })
})
module.exports = router