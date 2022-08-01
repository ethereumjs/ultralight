import jayson from 'jayson/promise/index.js'
import {
  ENR,
  fromHexString,
  getHistoryNetworkContentId,
  ProtocolId,
  toHexString,
} from 'portalnetwork'

const bootnodes = [
  'enr:-IS4QFV_wTNknw7qiCGAbHf6LxB-xPQCktyrCEZX-b-7PikMOIKkBg-frHRBkfwhI3XaYo_T-HxBYmOOQGNwThkBBHYDgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQKHPt5CQ0D66ueTtSUqwGjfhscU_LiwS28QvJ0GgJFd-YN1ZHCCE4k',
  'enr:-IS4QDpUz2hQBNt0DECFm8Zy58Hi59PF_7sw780X3qA0vzJEB2IEd5RtVdPUYZUbeg4f0LMradgwpyIhYUeSxz2Tfa8DgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQJd4NAVKOXfbdxyjSOUJzmA4rjtg43EDeEJu1f8YRhb_4N1ZHCCE4o',
  'enr:-IS4QGG6moBhLW1oXz84NaKEHaRcim64qzFn1hAG80yQyVGNLoKqzJe887kEjthr7rJCNlt6vdVMKMNoUC9OCeNK-EMDgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQLJhXByb3LmxHQaqgLDtIGUmpANXaBbFw3ybZWzGqb9-IN1ZHCCE4k',
  'enr:-IS4QA5hpJikeDFf1DD1_Le6_ylgrLGpdwn3SRaneGu9hY2HUI7peHep0f28UUMzbC0PvlWjN8zSfnqMG07WVcCyBhADgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQJMpHmGj1xSP1O-Mffk_jYIHVcg6tY5_CjmWVg1gJEsPIN1ZHCCE4o',
]

const { Client } = jayson

const main = async () => {
  const ultralight = Client.http({ host: '127.0.0.1', port: 8545 })
  const ultralightENR = await ultralight.request('portal_nodeEnr', [])
  console.log(ultralightENR.result)

  const pings = bootnodes.map(async (boot, idx) => {
    return ultralight.request('portal_ping', [boot, ProtocolId.HistoryNetwork])
  })

  console.log(await pings[0])
  console.log(await pings[1])
  console.log(await pings[2])
  console.log(await pings[3])
}

main()
