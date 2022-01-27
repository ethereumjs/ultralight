import { Container } from '@chakra-ui/react'
// eslint-disable-next-line implicit-dependencies/no-implicit
import { Block, BlockHeader } from '@ethereumjs/block'
// eslint-disable-next-line implicit-dependencies/no-implicit
import Common from '@ethereumjs/common'
// eslint-disable-next-line implicit-dependencies/no-implicit
import { toBuffer } from 'ethereumjs-util'
import { useEffect, useState } from 'react'

export default function DisplayBlock() {
  const [chain, setChain] = useState<string>('mainnet')
  const [common, setCommon] = useState<Common>(new Common({ chain: 'mainnet' }))
  const [rlpHeader, setRlpHeader] = useState<string>(
    '0xf90211a0d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479405a56e2d52c817161883f50c441c3228cfe54d9fa0d67e4d450343046425ae4271474353857ab860dbc0a1dde64b41b5cd3a532bf3a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008503ff80000001821388808455ba422499476574682f76312e302e302f6c696e75782f676f312e342e32a0969b900de27b6ac6a67742365dd65f55a0526c41fd18e1b16f1a1215c2e66f5988539bd4979fef1ec4'
  )
  const [blockHeader, setBlockHeader] = useState<BlockHeader>(
    BlockHeader.fromRLPSerializedHeader(toBuffer(rlpHeader), { common: common })
  )
  const [block, setBlock] = useState<Block>(new Block(blockHeader))

  useEffect(() => {
    const c = new Common({ chain: chain })
    setCommon(c)
  }, [chain])

  //   const json = block.toJSON

  return <Container>Block {JSON.stringify(block.toJSON())}</Container>
}
