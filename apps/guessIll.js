import { segment } from 'oicq'
import plugin from '../../../lib/plugins/plugin.js'
import Config from '../components/Config.js'
import get from '../model/getdata.js'

await get.init()

var songsname = []
var songweights = {} //存储每首歌曲被抽取的权重
var info = get.info()
for (let i in info) {
    if(info[i]['illustration_big']) {
        songsname.push(i)
    }
}

//曲目初始洗牌
shuffleArray(songsname)

//将每一首曲目的权重初始化为1
songsname.forEach(song => {
    songweights[song] = 1
})

var gamelist = {}

export class phiguess extends plugin {
    constructor() {
        super({
            name: 'phi-game 猜曲绘',
            dsc: 'phi-plugin 猜曲绘',
            event: 'message',
            priority: 1000,
            rule: [
                {
                    reg: `^[#/](${Config.getDefOrConfig('config', 'cmdhead')})(\\s*)(guess|猜曲目|猜曲绘)$`,
                    fnc: 'start'
                },
                {
                    reg: `^.*$`,
                    fnc: 'guess'
                },
                {
                    reg: `^[#/](曲绘)?(ans|答案|结束)$`,
                    fnc: 'ans'
                }

            ]
        })

    }

    /**猜曲绘 */
    async start(e) {
        if (gamelist[e.group_id]) {
            e.reply("请不要重复发起哦！", true)
            return true
        }
        if (songsname.length == 0) {
            e.reply('当前曲库暂无有曲绘的曲目哦！更改曲库后需要重启哦！')
            return true
        }

        //抽取之前洗个牌
        shuffleArray(songsname)

        var song = getRandomSong()
        var songs_info = get.info()[song]
        if (typeof songs_info.illustration_big == 'undefined') {
            logger.error(`[phi guess]抽取到无曲绘曲目 ${songs_info.song}`)
            return true
        }

        gamelist[e.group_id] = songs_info.song

        var data = {
            illustration: get.getill(songs_info.song),
            width: 100,
            height: 100,
            x: randbt(2048 - 100),
            y: randbt(1080 - 100),
            blur: 10,
            style: 0,
        }

        var known_info = {}
        var remain_info = ['chapter', 'bpm', 'composer', 'length', 'illustrator', 'chart']
        /**
         * 随机给出提示
         * 0: 区域扩大
         * 1: 模糊度减小
         * 2: 给出一条文字信息
         * 3: 显示区域位置
         */
        var fnc = [0, 1, 2, 3]
        logger.info(data)

        e.reply(`下面开始进行猜曲绘哦！回答可以直接发送哦！每过${Config.getDefOrConfig('config', 'GuessTipCd')}秒后将会给出进一步提示。发送 #答案 结束游戏`)
        if (Config.getDefOrConfig('config', 'GuessTipRecall'))
            await e.reply(await get.getguess(e, data), false, { recallMsg: Config.getDefOrConfig('config', 'GuessTipCd') })
        else
            await e.reply(await get.getguess(e, data))

        for (var i = 0; i < 30; ++i) {

            var time = Config.getDefOrConfig('config', 'GuessTipCd')

            for (var j = 0; j < time; ++j) {
                await timeout(1000)
                if (gamelist[e.group_id]) {
                    if (gamelist[e.group_id] != songs_info.song) {
                        await gameover(e, data)
                        return true
                    }
                } else {
                    await gameover(e, data)
                    return true
                }
            }
            var remsg = [] //回复内容
            var tipmsg = '' //这次干了什么

            switch (fnc[randbt(fnc.length - 1)]) {
                case 0: {
                    area_increase(100, data, fnc)
                    if (Config.getDefOrConfig('config', 'isGuild')) {
                        tipmsg = `[区域扩增!]`
                    } else {
                        tipmsg = `\n[区域扩增!]`
                    }
                    break
                }
                case 1: {
                    blur_down(2, data, fnc)
                    if (Config.getDefOrConfig('config', 'isGuild')) {
                        tipmsg = `[清晰度上升!]`
                    } else {
                        tipmsg = `\n[清晰度上升!]`
                    }
                    break
                }
                case 2: {
                    gave_a_tip(known_info, remain_info, songs_info, fnc)
                    if (Config.getDefOrConfig('config', 'isGuild')) {
                        tipmsg = `[追加提示!]`
                    } else {
                        tipmsg = `\n[追加提示!]`
                    }
                    break
                }
                case 3: {
                    data.style = 1
                    fnc.splice(fnc.indexOf(3), 1)
                    if (Config.getDefOrConfig('config', 'isGuild')) {
                        tipmsg = `[全局视野!]`
                    } else {
                        tipmsg = `\n[全局视野!]`
                    }
                    break
                }
            }
            remsg = [await get.getguess(e, data)]
            remsg.push(tipmsg)
            if (known_info.chapter) remsg.push(`\n该曲目隶属于 ${known_info.chapter}`)
            if (known_info.bpm) remsg.push(`\n该曲目的 BPM 值为 ${known_info.bpm}`)
            if (known_info.composer) remsg.push(`\n该曲目的作者为 ${known_info.composer}`)
            if (known_info.length) remsg.push(`\n该曲目的时长为 ${known_info.length}`)
            if (known_info.illustrator) remsg.push(`\n该曲目曲绘的作者为 ${known_info.illustrator}`)
            if (known_info.chart) remsg.push(known_info.chart)

            if (gamelist[e.group_id]) {
                if (gamelist[e.group_id] != songs_info.song) {
                    await gameover(e, data)
                    return true
                }
            } else {
                await gameover(e, data)
                return true
            }

            if (Config.getDefOrConfig('config', 'GuessTipRecall'))
                e.reply(remsg, false, { recallMsg: Config.getDefOrConfig('config', 'GuessTipCd') })
            else
                e.reply(remsg)

        }

        var t = gamelist[e.group_id]
        delete (gamelist[e.group_id])
        await e.reply("呜，怎么还没有人答对啊QAQ！只能说答案了喵……")

        await e.reply(await get.getsongsinfo(e, t))
        await gameover(e, data)

        return true
    }

    /**玩家猜测 */
    async guess(e) {
        if (gamelist[e.group_id]) {
            var ans = e.msg.replace(/[#/](我)?猜(\s*)/g, '')
            var song = get.fuzzysongsnick(ans)
            if (song[0]) {
                for (var i in song) {
                    if (gamelist[e.group_id] == song[i]) {
                        var t = gamelist[e.group_id]
                        delete (gamelist[e.group_id])
                        await e.reply([segment.at(e.user_id), '恭喜你，答对啦喵！ヾ(≧▽≦*)o'], true)
                        await e.reply(await get.getsongsinfo(e, t))
                        return true
                    }
                }
                if (song[1]) {
                    e.reply(`不是 ${ans} 哦喵！≧ ﹏ ≦`, true, { recallMsg: 5 })
                } else {
                    e.reply(`不是 ${song[0]} 哦喵！≧ ﹏ ≦`, true, { recallMsg: 5 })
                }
                return true
            }
        }
        return false
    }

    async ans(e) {
        if (gamelist[e.group_id]) {
            var t = gamelist[e.group_id]
            delete (gamelist[e.group_id])
            await e.reply('好吧，下面开始公布答案。', true)
            await e.reply(await get.getsongsinfo(e, t))
            return true
        }
        return false
    }

}

/**游戏结束，发送相应位置 */
async function gameover(e, data) {
    data.ans = data.illustration
    data.style = 1
    await e.reply(await get.getguess(e, data))
}

/**
 * RandBetween
 * @param {number} top 随机值上界
 */
function randbt(top, bottom = 0) {
    return Number((Math.random() * (top - bottom)).toFixed(0)) + bottom
}

/**
 * 区域扩增
 * @param {number} size 增大的像素值
 * @param {object} data 
 * @param {Array} fnc 
 */
function area_increase(size, data, fnc) {
    if (data.height < 1080) {
        if (data.height + size >= 1080) {
            data.height = 1080
            data.y = 0
        } else {
            data.height += size
            data.y = Math.max(0, data.y - size / 2)
            data.y = Math.min(data.y, 1080 - data.height)
        }
    }
    if (data.width < 2048) {
        if (data.width + size >= 2048) {
            data.width = 2048
            data.x = 0
            fnc.splice(fnc.indexOf(0), 1)
        } else {
            data.width += size
            data.x = Math.max(0, data.x - size / 2)
            data.x = Math.min(data.x, 2048 - data.width)
        }
    } else {
        console.error('err')
        return true
    }
    return false
}

/**
 * 降低模糊度
 * @param {number} size 降低值
 */
function blur_down(size, data, fnc) {
    if (data.blur) {
        data.blur = Math.max(0, data.blur - size)
        if (!data.blur) fnc.splice(fnc.indexOf(1), 1)
    } else {
        console.error('err')
        return true
    }
    return false
}

/**
 * 获得一个歌曲信息的提示
 * @param {object} known_info 
 * @param {Array} remain_info 
 * @param {object} songs_info 
 * @param {Array} fnc
 */
function gave_a_tip(known_info, remain_info, songs_info, fnc) {
    if (remain_info.length) {
        var t = randbt(remain_info.length - 1)
        var aim = remain_info[t]
        remain_info.splice(t, 1)
        known_info[aim] = songs_info[aim]
        if (!remain_info.length) fnc.splice(fnc.indexOf(2), 1)

        if (aim == 'chart') {
            var t = ['EZ', 'HD', 'IN', 'AT']
            var t1
            if (songs_info[aim]['AT']) {
                t1 = t[randbt(3)]
            } else {
                t1 = t[randbt(2)]
            }
            known_info[aim] = `\n该曲目的 ${t1} 谱面的`
            switch (randbt(2)) {
                case 0: {
                    /**定数 */
                    known_info[aim] += `定数为 ${songs_info[aim][t1]['difficulty']}`
                    break
                }
                case 1: {
                    /**物量 */
                    known_info[aim] += `物量为 ${songs_info[aim][t1]['combo']}`
                    break

                }
                case 2: {
                    /**谱师 */
                    known_info[aim] += `谱师为 ${songs_info[aim][t1]['charter']}`
                    break
                }
            }
        }
    } else {
        console.error('err')
    }
    return false
}


function timeout(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms, 'done');
    });
}

//将数组顺序打乱
function shuffleArray(arr) {
    var len = arr.length
    for (var i = 0; i < len - 1; i++) {
        var index = randint(0,len - i)
        var temp = arr[index]
        arr[index] = arr[len - i - 1]
        arr[len - i - 1] = temp
    }
    return arr
}

//定义生成指定区间带有指定小数位数随机数的函数
function randfloat(min, max, precision = 0) {
    var range = max - min
    var randomOffset = Math.random() * range
    var randomNumber = (randomOffset + min) + range * Math.pow(10, -precision)
  
    return precision === 0 ? Math.floor(randomNumber) : randomNumber.toFixed(precision)
}

//定义生成指定区间整数随机数的函数
function randint(min, max) {
    var range = max - min + 1
    var randomOffset = Math.floor(Math.random() * range)
    return (randomOffset + min) % range + min
}

//定义随机抽取曲目的函数
function getRandomSong() {
    //计算曲目的总权重
    var totalWeight = Object.values(songweights).reduce((total, weight) => total + weight, 0)
  
    //生成一个0到总权重之间带有16位小数的随机数
    var randomWeight = randfloat(0, totalWeight, 16)
  
    var accumulatedWeight = 0
    for (const song of songsname) {
      accumulatedWeight += songweights[song]
      //当累积权重超过随机数时，选择当前歌曲
      if (accumulatedWeight >= randomWeight) {
        songweights[song] *= 0.4 // 权重每次衰减60%
        return song
      }
    }
  
    //如果由于浮点数精度问题未能正确选择歌曲，则随机返回一首
    return songsname[randint(0,songsname.length - 1)]
}
