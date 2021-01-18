const request = require('request')
const cheerio = require('cheerio')
const log4js = require('log4js')
const getJSID = require('../crawler/main.js')
const {
  resOK,
  resEr
} = require('../response.js')

log4js.configure({
  appenders: {
    cheese: {
      type: "file",
      filename: process.cwd() + "/logs/log.log",
      maxLogSize: 20971520,
      backups: 10,
      encoding: "utf-8",
    }
  },
  categories: {
    cheese: {
      appenders: ["cheese"],
      level: "info"
    },
    default: {
      appenders: ["cheese"],
      level: "info"
    }
  }
});

const logger = log4js.getLogger("cheese");

module.exports = async function (req, res) {
  const {
    username,
    pwd
  } = req.body
  if (!username || !pwd) {
    console.log("账号或密码为空");
    return res.send(new resEr('Account wrong or request too fast'))
  }
  try {
    const JSID = await getJSID(username, pwd)
    request({
      url: 'http://jwgl.csuft.edu.cn/jsxsd/xxwcqk/xxwcqk_byxfqkcx.do',
      method: 'GET',
      headers: {
        'Cookie': JSID
      },
      gzip: true
    }, (err, ress, body) => {
      if (err || ress.statusCode != 200) {
        logger.error(`失败, ${$('div #Top1_divLoginName').text()}, ${JSID}, Error: ${err}`)
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