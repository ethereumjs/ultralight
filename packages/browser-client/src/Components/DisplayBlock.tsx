import { Container } from '@chakra-ui/react'
// eslint-disable-next-line implicit-dependencies/no-implicit
import { Block, BlockHeader } from '@ethereumjs/block'
// eslint-disable-next-line implicit-dependencies/no-implicit
import Common from '@ethereumjs/common'
// eslint-disable-next-line implicit-dependencies/no-implicit
import { toBuffer } from 'ethereumjs-util'

interface DisplayBlockProps {
  rlpHeader: string
}

export default function DisplayBlock(props: DisplayBlockProps) {
  const rlpHeader = props.rlpHeader
  const chain = 'mainnet'
  const common = new Common({ chain: chain })
  const blockHeader = BlockHeader.fromRLPSerializedHeader(toBuffer(rlpHeader), { common: common })

  const block = new Block(blockHeader)

  //   const json = block.toJSON

  return <Container>Block {JSON.stringify(block.toJSON())}</Container>
}
