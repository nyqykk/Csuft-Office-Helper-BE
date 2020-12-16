const request = require('request')
const cheerio = require('cheerio')
const getJSID = require('../crawler/main.js')
const {
  resOK,
  resEr
} = require('../response.js')
module.exports = async function (req, res) {
  const {
    username,
    pwd
  } = req.body
  try {
    const JSID = await getJSID(username, pwd)
    request({
      url: 'http://jwgl.csuft.edu.cn/jsxsd/xxwcqk/xxwcqk_byxfqkcx.do',
      method: 'GET',
      headers: {
        'Cookie': JSID
      },
      gzip: true
    }, (r1, r2, body) => {
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
      res.send(new resOK({
        lastList,
        position
      }))

    })

  } catch (err) {
    res.send(new resEr(err))
  }
}