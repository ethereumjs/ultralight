import { ENR } from '@chainsafe/enr'
import jayson from 'jayson/promise/index.js'

const { Client } = jayson

const ultralightBootnodes = [
  'enr:-I24QO4X4ECNw19M51l3UYjQPq91dwy7FzEdOb43xEjvGnJMOU2cqD-KQ0FNZbpuzRWyQRiqLinAWw2qsgnRQ2guLt0EY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQOdan7kE4_KU8yM1SNzw9OIrd-oQOlDBnz01fA2fz_1yoN1ZHCCE44',
  'enr:-I24QFm1w_fuMnMf4DsUr_PDVzn_Kn_PY6zQYsoWkJIk4evHUxO8OBacbdo4-7bAyvrXsYgCmOVgOQulvA_9ompMfc8EY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQPeFHF3dY24vc0QgrRIM1vz3ZFnbmddmKLjhP34pxaD5YN1ZHCCE40',
  'enr:-I24QEkyh8nyn2PLMokMXzc_zpuiYxN2VHKrGfU7YI60K9_5YoGZsq-kSngZqLHeOWP3La-Pt5zaojutlsbbsbZ30dYEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQM-ccaM0TOFvYqC_RY_KhZNhEmWx8zdf6AQALhKyMVyboN1ZHCCE4w',
  'enr:-I24QDoMcfNTC3xoH_TSmALXS4WMybTM5SQrysabBxR1DG_UaXHVRHtpQdiGNhxqjHvfSONhnPETB8HorZYplIluDS0EY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQOImp2idIf2UoY-GoY49pOeJAtqeeDLfb5VDxj94h_I44N1ZHCCE48',
  'enr:-I24QHZRM9Sd3UgUOdB443q3nX6NOUsg0VMyarcfD69z8M3SB1vW2hkqiPFczPpyY6wSUCcUeXTig75sC5fT4YnsL7MEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQMGuOLosx85PYtBn7rULoHY9EAtLmGTn7XWoIvFqvq4qIN1ZHCCE5A',
  'enr:-I24QGMQnf1FhP_-tjr7AdT3aJbowJeowuAktBOmoTaxu3WsNPlB1MaD704orcQO8kncLKhEQPOCTv1LSkU27AUldyoEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQLJhXByb3LmxHQaqgLDtIGUmpANXaBbFw3ybZWzGqb9-IN1ZHCCE4k',
  'enr:-I24QNw9C_xJvljho0dO27ug7-wZg7KCN1Mmqefdvqwxxqw3X-SLzBO3-KvzCbGFFJJMDn1be6Hd-Bf_TR3afjrwZ7UEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQJMpHmGj1xSP1O-Mffk_jYIHVcg6tY5_CjmWVg1gJEsPIN1ZHCCE4o',
  'enr:-I24QOz_tsZ8kOSU_zxXh2HOAxLyAIOeqHZP3Olzgsu73uMRTh8ul7sigT4Q1LaiT12Me2BFm5a4Izi6PCR0_Xe9AHUEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQIdyr0pquxuEW1mHQC0_j0mjB1fIfWZEZLlr7nfaKQXLYN1ZHCCE5E',
  'enr:-I24QD_1X6GriBdbJzOb5bgKqwrZyKHmemXo6OD5h6rmajHhcx0nTEMhqza6BaCA5DNXOi58wszHenV2pIXSTkvGaEsEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQNliw-242ySvi8lxyNOfrkfkC071-aS8iMAYd82EZ1SLYN1ZHCCE5I',
  'enr:-I24QMeElaS4lKvAtYQYmqBkvUc516OLykrLq0DNrw2kuB00EZVXAgFNGlvNz2U1gqVIMzgNg73RPK2j7UT6388HbdcEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQKb1jKQ-3sdzLAIL-a-KM4zTVnmgGIKLuKlh61UGoU8jYN1ZHCCE40',
  'enr:-I24QKRKw-asojN9E1YCyJnsyzERVqhnwWFXBobI7E91-LAqFx9IqouzXszzuuh_Q0WzbqFkR32pgCSmPezXcAPeFI0EY4d1IDAuMC4xgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQMzvDQGNzKQSw3uGSZE86LqS5Xm5KYByI56NOZzTwWiRoN1ZHCCE4w',
  'enr:-I24QK_aSBXvKCAdMsrRioJDSPlJEl79fO5VX2JTrZEks2gbcrarbdfkWMMyEoS_2879w9bnJ14iC9hA6UWexjQ25IYEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQJxPJGDYLZ_QTU310eORFp6-NEs6ThGXpNULnAXPyiKy4N1ZHCCE4o',
  'enr:-I24QDT851x-fW12txAIkCOhq5guf9iMkY7qasRkxfECFsVGS9GnGf_xhy40rAB2aFV8M1kbAo0UMGs-vlDx1JJ1lxQEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQKJUamKYO0FWvhv_-H4p1nLdyAqXZWGEzkb9Lk7NtvrR4N1ZHCCE4s',
  'enr:-I24QKa9-vJDAoEiZ4Eio0_z1_fH5OoCAY0mqIuBJ9iJOt9QXie9sAZbrrouToPwTu9hK1CukT7H-qBfdlzMVG2ryy8EY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQKHPt5CQ0D66ueTtSUqwGjfhscU_LiwS28QvJ0GgJFd-YN1ZHCCE4k',
  'enr:-I24QDs2O04xIlgNMLYzChw-YEcsOsVvkuAYVosX4CoDrFGlMbJQHfrodqYH7TvjZ8v1sNUaiG_7mD8LqFsMGhYf80UEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQO7DZE841adtMdh8qsDYCDyTjGLud1HZJg-P-OAbTDVz4N1ZHCCE4s',
]

const main = async () => {
  const local = Client.http({ host: '0.0.0.0', port: 8545 })
  const enrs: ENR[] = ultralightBootnodes.map((e) => {
    return ENR.decodeTxt(e)
  })
  const nodes = new Map<string, Map<number, any>>()

  for (const e of enrs) {
    const nodeInfo = {
      enr: e.encodeTxt(),
      nodeId: e.nodeId,
      tag: e.kvs.get('c')?.toString(),
    }
    try {
      const addr = e.getLocationMultiaddr('udp')!.nodeAddress()
      console.log(addr)
      if (!nodes.has(addr.address)) {
        nodes.set(addr.address, new Map<number, any>())
      }
      nodes.get(addr.address)!.set(addr.port, nodeInfo)
    } catch (err: any) {
      console.log(`error with enr: ${e.encodeTxt()}`)
      console.log(err.message)
    }
  }

  for await (const [addr, port] of nodes.entries()) {
    console.log(addr)
    for await (const [p, info] of port.entries()) {
      const req = await local.request('portal_historyPing', [info.enr])
    if (req.result) {
        console.log({
            [p]: {
                ...req.result.payload.ClientInfo,
                dataRadius: Number(req.result.payload.DataRadius) / (2 ** 256) * 100 + '%',
                capabilities: req.result.payload.Capabilities,

            }
        })
    } else {
        console.log({
            [p]: {
                error: req.error,
            }
        })
    }
    }
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
