
import plugin from '../../../lib/plugins/plugin.js'
import get from '../model/getdata.js'
import common from "../../../lib/common/common.js"
import { segment } from 'oicq'

var userdata = []
var songlist = get.getData('songlist') //曲名排序的歌曲列表
let showconfig = get.getData('showconfig')
let infolist = get.getData('infolist')

export class phirks extends plugin {
    constructor() {
        super({
            name: 'phigrosrks计算器',
            dsc: 'rks计算',
            event: 'message',
            priority: 1000,
            rule: [
                {
                    reg: '^#phi曲.*$',
                    fnc: 'serch'
                },
                {
                    reg: '^#phi设置别名.*$',
                    fnc: 'setnick'
                },
                {
                    reg: '^#phi申请.*$',
                    fnc: 'sendnick'
                },
                {
                    reg: '^#phi查询.*$',
                    fnc: 'find'
                },
                {
                    reg: '^#phi随机.*$',
                    fnc: 'randmic'
                },
                {
                    reg: '^#phi计算等效rks.*$',
                    fnc: 'comtorks'
                },
                {
                    reg: '^#phi计算推分rks.*$',
                    fnc: 'comtuifenrks'
                }
            ]
        })

    }


    /**歌曲图鉴 */
    async serch(e) {
        infolist = get.getData('infolist')
        songlist = get.getData('songlist')
        let msg = e.msg.replace(/#phi曲(\s*)/g, "")
        let name = get.songsnick(msg)
        if (name) {
            let msgRes = get.getsongsinfo(name)
            e.reply(msgRes, true)
        } else {
            await e.reply(`未找到${msg}的相关曲目信息QAQ\n可以输入 #phi申请 原曲名称 ---> 别名 来向主人提出命名申请哦！`, true)
        }
    }

    /**设置别名 */
    async setnick(e) {
        if (!e.isMaster) {
            e.reply("只有主人可以设置别名哦！")
        }
        let msg = e.msg.replace(/#phi设置别名(\s*)/g, "")
        msg = msg.replace(/(\s*)--->(\s*)/g," ---> ")
        msg = msg.split(" ---> ")
        if (msg[1]) {
            msg[0] = get.songsnick(msg[0])
            if (infolist[`${msg[0]}`]) {
                get.setnick(`${msg[0]}`, `${msg[1]}`)
                e.reply("设置完成！")
            } else {
                e.reply(`输入有误哦！没有找到“${msg[0]}”这首曲子呢！`)
            }
        } else {
            e.reply(`输入有误哦！请先输入本名在输入别名并且以--->分割哦！`)
        }
        return true
    }

    /**申请设置别名 */
    async sendnick(e) {
        let tododata = get.getData('tododata')
        tododata[`${tododata['tot']++}`] = [e.msg.replace(/#phi申请(\s*)/g, ""), e.user_id]
        get.setData('tododata', tododata)
        e.reply("申请成功！", true)
    }

    /**phi曲目查询 */
    async find(e) {
        showconfig = await get.getData('showconfig')
        infolist = await get.getData('infolist')
        infolist = await get.getData('infolist')
        songlist = await get.getData('songlist')
        let msg = e.msg.replace(/#phi查询(\s*)/g, "")
        if (msg.includes("章节")) {
            let chaplist = []
            let added = 1
            let msgRes = []
            let msgcnt = 0
            while (added) {
                added = 0
                let nowchap = 0
                let cnt = 0
                let info = []
                for (let i = 0; songlist[i]; ++i) {
                    let mic = songlist[i]
                    let chap = infolist[`${mic}`]['chap']
                    if (chaplist[`${chap}`]) {
                        continue
                    } else if (chap == nowchap) {
                        info[cnt++] = getsongsinfo(mic)
                        ++added
                    } else if (!cnt) {
                        nowchap = chap
                        info[cnt++] = `vis`
                        info[cnt++] = getsongsinfo(mic)
                        ++added
                    }
                }
                if (added) {
                    info[0] = `当前章节：${nowchap}\n共含${cnt - 1}首歌`
                    chaplist[`${nowchap}`] = 1
                    let temp = await common.makeForwardMsg(e, info, "")
                    msgRes[msgcnt++] = temp
                }
            }
            let res = await common.makeForwardMsg(e, msgRes, "")
            logger.info(res)
            e.reply(res)
        }
        return true
    }

    /**随机定级范围内曲 */
    async randmic(e) {
        let msg = e.msg.replace(/#phi随机(\s*)/g, "")
        let isask = [1, 1, 1, 1]
        if (e.msg.includes('AT') || e.msg.includes('IN') || e.msg.includes('HD') || e.msg.includes('EZ')) {
            isask = [0, 0, 0, 0]
            if (e.msg.includes('AT')) { isask[0] = 1 }
            if (e.msg.includes('IN')) { isask[1] = 1 }
            if (e.msg.includes('HD')) { isask[2] = 1 }
            if (e.msg.includes('EZ')) { isask[3] = 1 }
        }
        msg = msg.replace(/\s*|AT|IN|HD|EZ/g, "")
        msg = msg.replace(/AT/g, "")
        msg = msg.replace(/IN/g, "")
        msg = msg.replace(/EZ/g, "")
        let rank = msg.split('-')
        let randm1 = Math.floor(Math.random() * 165)
        let mic = songlist[randm1]
        if (rank[0]) {
            if (!rank[1] || rank[0] < 0 || rank[1] < 0 || (rank[0] > 16 && rank[1] > 16)) {
                e.reply(`${msg}是哪门子的定级范围呀！请用 - 作为分隔符！`)
                return true
            } else {
                if (rank[0] > rank[1]) {
                    let tem = rank[0]
                    rank[0] = rank[1]
                    rank[1] = tem
                }
                logger.info(`${rank[0]}   ${rank[1]}`)
                let cnt = 0
                while (++cnt) {
                    if (cnt > 10000) {
                        e.reply(`没有找到符合要求的曲目！QAQ`, true)
                        return true
                    }
                    let torank = infolist[`${mic}`]['at_level']
                    if (isask[0] && torank >= rank[0] && torank <= rank[1]) {
                        break
                    }
                    torank = infolist[`${mic}`]['in_level']
                    if (isask[1] && torank >= rank[0] && torank <= rank[1]) {
                        break
                    }
                    torank = infolist[`${mic}`]['hd_level']
                    if (isask[2] && torank >= rank[0] && torank <= rank[1]) {
                        break
                    }
                    torank = infolist[`${mic}`]['ez_level']
                    if (isask[3] && torank >= rank[0] && torank <= rank[1]) {
                        break
                    }
                    randm1 = Math.floor(Math.random() * 165)
                    mic = songlist[randm1]
                }
            }
        }
        e.reply(get.getsongsinfo(`${mic}`), true)
    }

    async comtorks(e) {
        infolist = get.getData('infolist')
        let msg = e.msg.replace(/#phi计算等效rks(\s*)/g, "")
        let diffic = 0
        if (msg.includes('-AT')) {
            diffic = 'AT'
            msg = msg.replace(/(\s*)-AT/g, "")
        } else if (msg.includes('-IN')) {
            diffic = 'IN'
            msg = msg.replace(/(\s*)-IN/g, "")
        } else if (msg.includes('-HD')) {
            diffic = 'HD'
            msg = msg.replace(/(\s*)-HD/g, "")
        } else if (msg.includes('-EZ')) {
            diffic = 'EZ'
            msg = msg.replace(/(\s*)-EZ/g, "")
        } else {
            e.reply(`没有指定难度我怎么算嘛！请在末尾加上 -难度 哦！`)
            return true
        }
        msg = msg.replace(/(\s*)\|(\s*)/g," | ")
        let data = msg.split(" | ")
        if (!data[1] || typeof (Number(data[1])) != 'number') {
            e.reply(`请在曲目名称和 acc 之间以 | 分隔！`)
            return true
        }
        logger.info(`${data}  ${diffic}`)
        if (data[1] < 1 || data[1] > 100) {
            e.reply(`请输入正确的acc！单位%。`)
            return true
        }
        let mic = get.songsnick(data[0])
        if (!mic) {
            e.reply(`没有找到 ${data[0]} 相关的曲目信息！\nQAQ`)
        } else if (!infolist[`${mic}`][`${diffic.toLowerCase()}_level`]) {
            e.reply(`${mic} 没有 ${diffic} 这个难度吧喂！请在难度前面加 -`)
        } else {
            await e.reply(get.getsongsinfo(mic))
            e.reply(`计算结果：${Number(dxrks(data[1], infolist[`${mic}`][`${diffic.toLowerCase()}_level`])).toFixed(4)}`, true)
        }
        return true
    }

    /**计算推分所须 rks
     * 格式 #phi计算推分rks 曲名 | acc | 当前rsk -难度
     * 或 #phi计算推分rks 曲名 -难度 （对于已有rks数据的用户）
     */
    async comtuifenrks(e) {
        infolist = get.getData('infolist')
        let msg = e.msg.replace(/#phi计算推分rks(\s*)/g, "")
        let diffic = 0
        if (msg.includes('-AT')) {
            diffic = 'AT'
            msg = msg.replace(/(\s*)-AT/g, "")
        } else if (msg.includes('-IN')) {
            diffic = 'IN'
            msg = msg.replace(/(\s*)-IN/g, "")
        } else if (msg.includes('-HD')) {
            diffic = 'HD'
            msg = msg.replace(/(\s*)-HD/g, "")
        } else if (msg.includes('-EZ')) {
            diffic = 'EZ'
            msg = msg.replace(/(\s*)-EZ/g, "")
        } else {
            e.reply(`没有指定难度我怎么算嘛！请在末尾加上 -难度 哦！`)
            return true
        }
        userdata = get.getData(`${e.user_id}`)
        /**判断是否有本地rks数据 */
        let local = 0
        if (userdata && (userdata["finish"] || userdata["sutdown"])) {
            local = 1
        }
        msg = msg.replace(/(\s*)\|(\s*)/g," | ")
        let data = msg.split(" | ")
        /**是否输入rks */
        if (!data[2]) {
            if (!local) {
                e.reply(`糟糕，读入出错了呢！请按照 【名称 | 当前acc | 当前rks】 的格式发送哦！`)
                return true
            } else {
                /**使用本地rks数据 */
                let mic = get.songsnick(data[0])
                data[1] = userdata[`${mic}`][`${diffic}`]
                data[2] = userdata["b19"]["rank"]
                if (!mic) {
                    e.reply(`没有找到 ${data[0]} 相关的曲目信息！\nQAQ`)
                    return true
                } else if (!infolist[`${mic}`][`${diffic.toLowerCase()}_level`]) {
                    e.reply(`${mic} 没有 ${diffic} 这个难度吧喂！请在难度前面加 -`)
                    return true
                } else {
                    e.reply(get.getsongsinfo(mic))
                    /**先计算等效rks */
                    let rks = dxrks(data[1], infolist[`${mic}`][`${diffic.toLowerCase()}_level`]) > data[2]
                    if (rks >= data[2]) {
                        /**如果大于等于当前rks */
                        e.reply(`这首歌目前已经为你贡献了等效 ${rks} 的 rks 了哦！接下来 acc 的任何一点增长都会对 rks 有帮助的！`)
                        return true
                    } if (infolist[`${mic}`][`${diffic.toLowerCase()}_level`] < data[2]) {
                        /**如果歌曲本身定数小于rks */
                        e.reply(`这首歌的定数太低了吧！你的 b19 的等效 rks 都有 ${data[2]} 了好嘛！`)
                        return true
                    } else {
                        /**计算推分所需rks */
                        let ans = 45 * Math.sqrt(data[2] / infolist[`${mic}`][`${diffic.toLowerCase()}_level`]) + 55
                        e.reply(`至少要把这首歌的 acc 推到 ${ans.toFixed(4)} 以上哦！`,true)
                        return true
                    }
                }
            }
        }
        if (data[1] < 17 && data[2] > 17) {
            let tem = data[1]
            data[1] = data[2]
            data[2] = tem
        }
        if (data[2] > 17) {
            e.reply(`rks怎么可能会大于 17 啊！`)
            return true
        }
        if (data[1] > 100) {
            e.reply(`acc 为什么会比 100 还高啊！`)
            return true
        }
        let mic = get.songsnick(data[0])
        if (!mic) {
            e.reply(`没有找到 ${data[0]} 相关的曲目信息！\nQAQ`)
            return true
        } else if (!infolist[`${mic}`][`${diffic.toLowerCase()}_level`]) {
            e.reply(`${mic} 没有 ${diffic} 这个难度吧喂！请在难度前面加 -`)
            return true
        } else {
            e.reply(get.getsongsinfo(mic))
            /**先计算等效rks */
            let rks = dxrks(data[1], infolist[`${mic}`][`${diffic.toLowerCase()}_level`])
            logger.info(data)
            if (rks >= data[2]) {
                /**如果大于等于当前rks */
                e.reply(`这首歌目前已经为你贡献了等效 ${rks} 的 rks 了哦！接下来 acc 的任何一点增长都会对 rks 有帮助的！`)
                return true
            } if (infolist[`${mic}`][`${diffic.toLowerCase()}_level`] < data[2]) {
                /**如果歌曲本身定数小于rks */
                if (local) {
                    e.reply(`这首歌的定数太低了吧！如果需要使用本地 rks 信息的话请不要输入 rks 哦！`)
                } else {
                    e.reply(`这首歌的定数太低了吧！在没有你的全部 rks 信息之前是不可能算出来的吧！`)
                }
                return true
            } else {
                /**计算推分所需rks */
                let ans = 45 * Math.sqrt(data[2] / infolist[`${mic}`][`${diffic.toLowerCase()}_level`]) + 55
                e.reply(`需要把这首歌的 acc 推到 ${ans.toFixed(4)} 以上哦！由于 phigros 的平均数计算规则，所需的 acc 可能会更小哦！`,true)
                return true
            }
        }
    }
}


/**快速获取歌曲信息 */
function getsongsinfo(mic) {
    let name = mic
    if (name) {
        let msgRes = []
        let cnt = 0
        for (let i = 1; ; ++i) {
            if (showconfig[`${i}`]['vis'] == '结束') {
                /**结束 */
                break
            }
            switch (showconfig[`${i}`]['vis']) {
                case '曲绘': {
                    /**特殊类型：曲绘 */
                    msgRes[cnt++] = this.getimg(name, true)
                    break
                } case '文字': {
                    /**特殊类型：文字 */
                    msgRes[cnt++] = showconfig[`${i}`]['val']
                    break
                } case '定级': {
                    /**特殊类型：定级(物量)  */
                        if (infolist[`${name}`]['sp_level']) {
                            msgRes[cnt++] = `SP: ${infolist[`${name}`]['sp_level']}    物量: ${infolist[`${name}`]['sp_combo']}\n谱师: ${infolist[`${name}`]['sp_charter']}\n`
                        }
                        if (infolist[`${name}`]['at_level']) {
                            msgRes[cnt++] = `AT: ${infolist[`${name}`]['at_level']}    物量: ${infolist[`${name}`]['at_combo']}\n谱师: ${infolist[`${name}`]['at_charter']}\n`
                        }
                        if (infolist[`${name}`]['in_level']) {
                            msgRes[cnt++] = `IN: ${infolist[`${name}`]['in_level']}    物量: ${infolist[`${name}`]['in_combo']}\n谱师: ${infolist[`${name}`]['in_charter']}\n`
                        }
                        if (infolist[`${name}`]['hd_level']) {
                            msgRes[cnt++] = `HD: ${infolist[`${name}`]['in_level']}    物量: ${infolist[`${name}`]['hd_combo']}\n谱师: ${infolist[`${name}`]['hd_charter']}\n`
                        }
                        if (infolist[`${name}`]['ez_level']) {
                            msgRes[cnt++] = `EZ: ${infolist[`${name}`]['ez_level']}    物量: ${infolist[`${name}`]['ez_combo']}\n谱师: ${infolist[`${name}`]['ez_charter']}`
                        }
                    break
                } case '曲名': {
                    msgRes[cnt++] = infolist[`${name}`][`song`]
                    break
                } case '曲师': {
                    msgRes[cnt++] = infolist[`${name}`][`composer`]
                    break
                } case '长度': {
                    msgRes[cnt++] = infolist[`${name}`][`length`]
                    break
                } case '章节': {
                    msgRes[cnt++] = infolist[`${name}`][`chapter`]
                    break
                } case '画师': {
                    msgRes[cnt++] = infolist[`${name}`][`illustrator`]
                    break
                } case 'BPM': {
                    msgRes[cnt++] = infolist[`${name}`][`bpm`]
                    break
                }
                default: {
                    /**错误类型 */
                    logger.info(`[phi 插件] 未找到 ${showconfig[`${i}`]['vis']} 所对应的信息`)
                }
            }
        }
        return msgRes
    } else {
        return `未找到${mic}的相关曲目信息QAQ`
    }
}

function dxrks(acc, rank) {
    if (acc == 100) {
        /**满分原曲定数即为有效rks */
        return rank
    } else if(acc < 55) {
        return 0
    } else {
        /**非满分计算公式 [(((acc - 55) / 45) ^ 2) * 原曲定数] */
        return rank * (((acc - 55) / 45) * ((acc - 55) / 45))
    }
}
