const { chromium} = require('playwright');
const request = require('request')
const http = require('http')
const encryptAES = require('./utils/util')
const events = require('events');

const eventEmitter = new events.EventEmitter();
const login_page_url = 'http://authserver.csuft.edu.cn/authserver/login?service=http%3A%2F%2Fjwgl.csuft.edu.cn%2F'
const login_api_url = 'http://authserver.csuft.edu.cn/authserver/login?service=http%3A%2F%2Fjwgl.csuft.edu.cn%2F'

function f1(username, password) {
  return new Promise((resolve, reject) => {
    request(login_page_url, (er, res, html) => {
      if (er) {
        return reject(er)
      }
      const matchResult1 = String(html).match(/pwdDefaultEncryptSalt = "(.*)";/g)
      if (!matchResult1) {
        return reject('No content')
      }
      if (matchResult1.length <= 0) {
        return reject('No content')
      }
      const pwdDefaultEncryptSalt = matchResult1[0].slice(25, -2)

      const matchResult2 = String(html).match(/(LT-.*cas)/g)
      if (!matchResult2) {
        return reject('No content')
      }
      if (matchResult2.length <= 0) {
        return reject('No content')
      }
      const lt = matchResult2[0]

      const pwd = encodeURIComponent(encryptAES(password, pwdDefaultEncryptSalt))

      const data = `username=${username}&password=${pwd}&lt=${lt}&dllt=userNamePasswordLogin&execution=e1s1&_eventId=submit&rmShown=1`
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data, 'utf-8'),
        'Cookie': res.headers['set-cookie']
      }
      resolve({
        data,
        headers
      })
    })
  })
}

function f2(username, password) {
  return new Promise(async (resolve, reject) => {
    f1(username, password)
      .then(({
               data,
               headers
             }) => {
        request({
          url: login_api_url,
          method: "POST",
          json: true,
          headers: headers,
          body: data
        }, (er, res, body) => {
          if (er) {
            return reject(er)
          }
          if (res.statusCode === 302) {
            let newUrl = res.caseless.dict.location
            resolve(newUrl)
          } else {
            return reject('Account wrong or request too fast')
          }

        })
      })
      .catch(er => {
        return reject(er)
      })

  })
}

module.exports = {
  getJsidByPlayWright: async (name,password) => {
    const browser = await chromium.launch({
      headless: false,
    })
    eventEmitter.once('getResultBySpider', async () => {
      console.log('getResultBySpider');
      await browser?.close();
      return 'getResultBySpider';
    });
    let page, JIDS = [];
    try{
      const context = await browser.newContext()
      await context.route('**/*.{png,jpg,jpeg}', route => route.abort());
      page = await context.newPage(ignoreHTTPSErrors=true);
      // await page.coverage.stopCSSCoverage()
      //模拟登陆
      await page.goto('http://authserver.csuft.edu.cn/authserver/login?service=http%3A%2F%2Fjwgl.csuft.edu.cn%2F')
      await page.fill("#username", name);
      await page.fill("#password", password);
      await page.click('.auth_login_btn');
      //得到cookie
      const pageCookie= await context.cookies()
      const SERVERID = pageCookie.filter((element)=>{
        if(element['name']==='SERVERID'){
          return true
        }
      })
      const JID = pageCookie.filter((element)=>{
        if(element['name']==='JSESSIONID'&&element['domain']==='jwgl.csuft.edu.cn'){
          return true
        }
      })
      for (let i in JID){
        JIDS.push(`${JID[i].name}=${JID[i].value}; Path=/,SERVERID=${SERVERID[i].value}; path=/`)
      }
    }catch (e){
      console.log(e)
    }finally {
      await page.close()
      await browser.close()
      if(JIDS.length===1){
        eventEmitter.emit('getResultByPlayWright');
        return JIDS[0];
      }
      else return -1
    }
  },
  getJsidBySpider: function (username, password) {
    return new Promise((resolve, reject) => {
      eventEmitter.once('getResultByPlayWright', () => {
        console.log('getResultByPlayWright')
        return reject('getResultByPlayWright');
      });
      f2(username, password)
        .then((newUrl) => {
          request({
            url: newUrl,
            method: 'HEAD'
          }, (er, res, body) => {
            if (er) {
              return reject(er)
            }
            const ref = res.request.headers.referer
            if (res.statusCode === 404) {
              http.get(ref, res => {
                if (res.statusCode === 302) {
                  const JID = res.headers['set-cookie']
                  console.log('set-cookieset-cookieset-cookie')
                  eventEmitter.emit('getResultBySpider');
                  resolve(JID)
                } else {
                  return reject('Unexpected error')
                }
              })
            } else {
              return reject('Unexpected error')
            }

          })

        })
        .catch(er => {
          return reject(er)
        })
    })
  }
}