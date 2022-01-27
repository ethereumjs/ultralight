import { Container } from '@chakra-ui/react'
// eslint-disable-next-line implicit-dependencies/no-implicit
import { Block, BlockHeader } from '@ethereumjs/block'
// eslint-disable-next-line implicit-dependencies/no-implicit
import Common from '@ethereumjs/common'
// eslint-disable-next-line implicit-dependencies/no-implicit
import { toBuffer } from 'ethereumjs-util'
import { useEffect, useState } from 'react'

interface DisplayBlockProps {
  rlpHeader: string
}

export default function DisplayBlock(props: DisplayBlockProps) {
  const rlpHeader = props.rlpHeader

  const [chain, setChain] = useState<string>('mainnet')
  const [common, setCommon] = useState<Common>(new Common({ chain: 'mainnet' }))
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
