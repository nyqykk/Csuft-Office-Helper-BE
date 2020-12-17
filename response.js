module.exports.resOK = class {
    constructor(data) {
        this.code = 200
        this.data = {
            data
        }
    }
}
module.exports.resEr = class {
    constructor(msg) {
        this.code = 400
        this.msg = msg
    }
}