const request = require('request')
const cheerio = require('cheerio')
const log4js = require('log4js')

const { getJsidByPlayWright, getJsidBySpider } = require('../crawler/main.js')
const {
  resOK,
  resEr
} = require('../response.js')

Promise.prototype.myRace = function (target) {
  let arr = Array.from(target), rejectCount = 0;
  const expectedCount = arr.length;
  return new Promise((resolve, reject) => {
    for(let i=0; i<arr.length; i++){
      if(typeof arr[i].then === 'function'){
        arr[i].then(value => resolve(value), (error) => {
          rejectCount++;
          if(rejectCount === expectedCount) {
            reject(error);
          }
        });
      }else{
        resolve(arr[i]);
      }
    }
  })
};

module.exports = async function (req, res) {
  const logger = log4js.getLogger("cheese");
  const {
    username,
    pwd
  } = req.body
  if (!username || !pwd) {
    console.log("账号或密码为空");
    return res.send(new resEr('Account wrong or request too fast'))
  }
  try {
    const JSID = await Promise.prototype.myRace([getJsidBySpider(username, pwd), getJsidByPlayWright(username, pwd)]);
    if(JSID===-1){
        return res.send(new resEr(`密码错误或网络问题`))
    }
    console.log(JSID)
    request({
      url: 'http://jwgl.csuft.edu.cn/jsxsd/xxwcqk/xxwcqk_byxfqkcx.do',
      method: 'GET',
      headers: {
        'Cookie': JSID
      },
      gzip: true
    }, (err, ress, body) => {
      if (err || ress.statusCode != 200 || !body) {
        logger.error(`失败, ${username}, ${JSID}, Error: ${err}`)
        return res.send(new resEr(`网络波动`))
      }
      const $ = cheerio.load(body)
      let num = 0
      let position = 0
      let flag = 0
      let obj = new Object()
      let lastList = []
      let name = ['listNum', 'time', 'classNum', 'className', 'credit', 'grade', 'studyStatus']

      const list = $('td').slice(8)
      list.each(function (index, ele) {
        if ($(this).text().indexOf('公共选修课修读情况') === -1) {
          obj[name[num]] = $(ele).text()
          obj['key'] = String(index)
          if (!flag) {
            num++
            if (num >= 7) {
              lastList.push(obj)
              num = 0
              obj = {}
              position++
            }
          } else {
            num++
            if (num >= 6) {
              lastList.push(obj)
              num = 0
              obj = {}
            }
          }
        } else {
          flag = 1
        }
      })
      logger.info(`成功, ${$('div #Top1_divLoginName').text()}, ${JSID}`)
      res.send(new resOK({
        lastList,
        position
      }))

    })

  } catch (err) {
    logger.info(`失败, ${username}, ${err}`)
    res.send(new resEr(err))
  }
}