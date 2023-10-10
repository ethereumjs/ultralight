import {
  BlockBodyContentType,
  BlockHeaderWithProof,
  EpochAccumulator,
  HistoryProtocol,
  PortalNetwork,
  ProtocolId,
  fromHexString,
  sszReceiptType,
  sszUnclesType,
  toHexString,
} from 'portalnetwork'
import { PublicProcudure } from './subscriptions.js'
import { z } from 'zod'
import { BlockHeader } from '@ethereumjs/block'
import { RLP } from '@ethereumjs/rlp'
import { TransactionFactory } from '@ethereumjs/tx'
const bootnodes = [
  'enr:-I24QDy_atpK3KlPjl6X5yIrK7FosdHI1cW0I0MeiaIVuYg3AEEH9tRSTyFb2k6lpUiFsqxt8uTW3jVMUzoSlQf5OXYBY4d0IDAuMS4wgmlkgnY0gmlwhKEjVaWJc2VjcDI1NmsxoQOSGugH1jSdiE_fRK1FIBe9oLxaWH8D_7xXSnaOVBe-SYN1ZHCCIyg',
  'enr:-I24QIdQtNSyUNcoyR4R7pWLfGj0YuX550Qld0HuInYo_b7JE9CIzmi2TF9hPg-OFL3kebYgLjnPkRu17niXB6xKQugBY4d0IDAuMS4wgmlkgnY0gmlwhJO2oc6Jc2VjcDI1NmsxoQJal-rNlNBoOMikJ7PcGk1h6Mlt_XtTWihHwOKmFVE-GoN1ZHCCIyg',
  'enr:-I24QI_QC3IsdxHUX_jk8udbQ4U2bv-Gncsdg9GzgaPU95ayHdAwnH7mY22A6ggd_aZegFiBBOAPamkP2pyHbjNH61sBY4d0IDAuMS4wgmlkgnY0gmlwhJ31OTWJc2VjcDI1NmsxoQMo_DLYhV1nqAVC1ayEIwrhoFCcHvWuhC_J-w-n_4aHP4N1ZHCCIyg',
  'enr:-IS4QGUtAA29qeT3cWVr8lmJfySmkceR2wp6oFQtvO_uMe7KWaK_qd1UQvd93MJKXhMnubSsTQPJ6KkbIu0ywjvNdNEBgmlkgnY0gmlwhMIhKO6Jc2VjcDI1NmsxoQJ508pIqRqsjsvmUQfYGvaUFTxfsELPso_62FKDqlxI24N1ZHCCI40',
  'enr:-IS4QNaaoQuHGReAMJKoDd6DbQKMbQ4Mked3Gi3GRatwgRVVPXynPlO_-gJKRF_ZSuJr3wyHfwMHyJDbd6q1xZQVZ2kBgmlkgnY0gmlwhMIhKO6Jc2VjcDI1NmsxoQM2kBHT5s_Uh4gsNiOclQDvLK4kPpoQucge3mtbuLuUGYN1ZHCCI44',
  'enr:-IS4QBdIjs6S1ZkvlahSkuYNq5QW3DbD-UDcrm1l81f2PPjnNjb_NDa4B5x4olHCXtx0d2ZeZBHQyoHyNnuVZ-P1GVkBgmlkgnY0gmlwhMIhKO-Jc2VjcDI1NmsxoQOO3gFuaCAyQKscaiNLC9HfLbVzFdIerESFlOGcEuKWH4N1ZHCCI40',
  'enr:-IS4QM731tV0CvQXLTDcZNvgFyhhpAjYDKU5XLbM7sZ1WEzIRq4zsakgrv3KO3qyOYZ8jFBK-VzENF8o-vnykuQ99iABgmlkgnY0gmlwhMIhKO-Jc2VjcDI1NmsxoQMTq6Cdx3HmL3Q9sitavcPHPbYKyEibKPKvyVyOlNF8J4N1ZHCCI44',
  'enr:-IS4QFV_wTNknw7qiCGAbHf6LxB-xPQCktyrCEZX-b-7PikMOIKkBg-frHRBkfwhI3XaYo_T-HxBYmOOQGNwThkBBHYDgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQKHPt5CQ0D66ueTtSUqwGjfhscU_LiwS28QvJ0GgJFd-YN1ZHCCE4k',
  'enr:-IS4QDpUz2hQBNt0DECFm8Zy58Hi59PF_7sw780X3qA0vzJEB2IEd5RtVdPUYZUbeg4f0LMradgwpyIhYUeSxz2Tfa8DgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQJd4NAVKOXfbdxyjSOUJzmA4rjtg43EDeEJu1f8YRhb_4N1ZHCCE4o',
  'enr:-IS4QGG6moBhLW1oXz84NaKEHaRcim64qzFn1hAG80yQyVGNLoKqzJe887kEjthr7rJCNlt6vdVMKMNoUC9OCeNK-EMDgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQLJhXByb3LmxHQaqgLDtIGUmpANXaBbFw3ybZWzGqb9-IN1ZHCCE4k',
  'enr:-IS4QA5hpJikeDFf1DD1_Le6_ylgrLGpdwn3SRaneGu9hY2HUI7peHep0f28UUMzbC0PvlWjN8zSfnqMG07WVcCyBhADgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQJMpHmGj1xSP1O-Mffk_jYIHVcg6tY5_CjmWVg1gJEsPIN1ZHCCE4o',
]
export const websocketProcedures = (portal: PortalNetwork, publicProcedure: PublicProcudure) => {
  const history = portal.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol

  const browser_nodeInfo = publicProcedure
    .meta({
      description: 'Get ENR, NodeId, Client Tag, and MultiAddress',
    })
    .mutation(() => {
      return {
        enr: portal.discv5.enr.encodeTxt(),
        nodeId: portal.discv5.enr.nodeId,
        client: 'ultralight',
        multiAddr: portal.discv5.enr.getLocationMultiaddr('udp')?.toString(),
      }
    })

  const local_routingTable = publicProcedure
    .meta({
      description: 'Get Local Routing Table',
    })
    .mutation(() => {
      return [...history.routingTable.buckets.entries()]
        .filter(([_, bucket]) => bucket.values().length > 0)
        .map(([idx, bucket]) => {
          return bucket
            .values()
            .map((enr) => [
              enr.kvs.get('c')?.toString() ?? '',
              enr.encodeTxt(),
              enr.nodeId,
              enr.getLocationMultiaddr('udp')!.toString(),
              idx,
            ])
        })
        .flat()
    })

  const ping = publicProcedure
    .meta({
      description: 'Send Ping to ENR',
    })
    .input(
      z.object({
        enr: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const _pong = await history.sendPing(input.enr)
      const pong = _pong
        ? { customPayload: toHexString(_pong.customPayload), enrSeq: Number(_pong.enrSeq) }
        : undefined
      return pong
    })

  const pingBootNodes = publicProcedure
    .meta({
      description: 'Ping all BootNodes',
    })
    .mutation(async () => {
      const pongs = []
      for await (const [idx, enr] of bootnodes.entries()) {
        const _pong = await history.sendPing(enr)
        console.log({
          enr: `${idx < 3 ? 'trin' : idx < 7 ? 'fluffy' : 'ultralight'}: ${enr.slice(0, 12)}`,
          _pong,
        })
        const pong = _pong
          ? {
              tag: `${idx < 3 ? 'trin' : idx < 7 ? 'fluffy' : 'ultralight'}`,
              enr: `${enr.slice(0, 12)}`,
              customPayload: BigInt(toHexString(_pong.customPayload)).toString(2).length,
              enrSeq: Number(_pong.enrSeq),
            }
          : {
              tag: ``,
              enr: ``,
              customPayload: '',
              enrSeq: -1,
            }
        pongs.push(pong)
      }
      return pongs
    })

  const browser_historyStore = publicProcedure
    .meta({
      description: 'Store Content',
    })
    .input(
      z.object({
        contentKey: z.string(),
        content: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const key = fromHexString(input.contentKey)
      try {
        await history.store(key[0], toHexString(key.slice(1)), fromHexString(input.content))
      } catch {
        return false
      }
      return true
    })
  const browser_historyLocalContent = publicProcedure
    .meta({
      description: 'Get Local Content',
    })
    .input(
      z.object({
        contentKey: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const contentKey = fromHexString(input.contentKey)
      const res = await history.findContentLocally(contentKey)
      console.log({
        method: 'browser_historyLocalContent',
        contentKey: input.contentKey,
        res,
      })
      const contentType = contentKey[0]
      let content = {}
      switch (contentType) {
        case 0: {
          const blockHeaderWithProof = BlockHeaderWithProof.deserialize(res)
          const header = BlockHeader.fromRLPSerializedHeader(blockHeaderWithProof.header, {
            setHardfork: true,
          }).toJSON()
          const proof =
            blockHeaderWithProof.proof.selector === 0
              ? []
              : blockHeaderWithProof.proof.value?.map((p) => toHexString(p))
          content = { header, proof }
          break
        }
        case 1: {
          const blockBody = BlockBodyContentType.deserialize(res)
          const transactions = blockBody.allTransactions.map((tx) =>
            TransactionFactory.fromSerializedData(tx).toJSON(),
          )
          const unclesRlp = toHexString(sszUnclesType.deserialize(blockBody.sszUncles))
          content = {
            transactions,
            uncles: {
              rlp: unclesRlp,
              count: RLP.decode(unclesRlp).length.toString(),
            },
          }
          break
        }
        case 2: {
          const receipt = sszReceiptType.deserialize(res)
          content = receipt
          break
        }
        case 3: {
          const epochAccumulator = EpochAccumulator.deserialize(res)
          content = epochAccumulator
          break
        }
        default: {
          content = {}
        }
      }
      return JSON.stringify(content)
    })

  return {
    browser_nodeInfo,
    local_routingTable,
    ping,
    pingBootNodes,
    browser_historyStore,
    browser_historyLocalContent,
  }
}
