import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
} from '@chakra-ui/react'
import { ethers } from 'ethers'
import { PortalNetwork } from 'portalnetwork'
import { useEffect, useState } from 'react'

interface ShowBlockContentProps {
  portal: PortalNetwork
}

class Block {
  parentHash: string
  sha3Uncles: string
  miner: string
  stateRoot: string
  receiptsRoot: string
  transactionRoot: string
  gasUsed: string
  difficulty: string
  number: string
  gasLimit: string
  transactions: string
  timeStamp: string
  extraData: string
  mixHash: string
  nonce: string
  info: Record<string, string | number>
  constructor(options: string[]) {
    this.parentHash = options[0]
    this.sha3Uncles = options[1]
    this.miner = options[2]
    this.stateRoot = options[3]
    this.receiptsRoot = options[4]
    this.transactionRoot = options[5]
    this.gasUsed = options[6]
    this.difficulty = options[7]
    this.number = options[8]
    this.gasLimit = options[9]
    this.transactions = options[10]
    this.timeStamp = options[11]
    this.extraData = options[12]
    this.mixHash = options[13]
    this.nonce = options[14]
    this.info = {
      parentHash: this.parentHash,
      sha3Uncles: this.sha3Uncles,
      miner: this.miner,
      stateRoot: this.stateRoot,
      receiptsRoot: this.receiptsRoot,
      transactionRoot: this.transactionRoot,
      gasUsed: Number(this.gasUsed),
      difficulty: Number(this.difficulty),
      number: Number(this.number),
      gasLimit: Number(this.gasLimit),
      transactions: this.transactions,
      timeStamp: this.timeStamp,
      extraData: this.extraData,
      mixHash: this.mixHash,
      nonce: Number(this.nonce),
    }
  }

  showInfo() {
    return (
      <Table size={'sm'} variant={'striped'}>
        <Thead></Thead>
        <Tbody>
          {Object.entries(this.info).map(([k, v], idx) => {
            return (
              <Tr key={idx}>
                <Th>{k}</Th>
                <Td>{v}</Td>
              </Tr>
            )
          })}
        </Tbody>
      </Table>
    )
  }
}

export default function ShowBlockContent(props: ShowBlockContentProps) {
  const [keys, setKeys] = useState<string[]>([])
  const [db, setDb] = useState<Map<string, string>>(new Map())
  // eslint-disable-next-line no-undef
  const [_display, setDisplay] = useState<JSX.Element>()

  const portal = props.portal

  function addNew(key: string, data: string) {
    setKeys([...keys, key])
    const d = db
    d.set(key, data)
    setDb(d)
  }

  useEffect(() => {
    portal.on('ContentAdded', (key, data) => {
      addNew(key, data)
    })
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function display(data: string) {
    const info = ethers.utils.RLP.decode(data)
    const newBlock: Block = new Block(info as string[])
    return newBlock.showInfo()
  }

  function blockAccordion() {
    return (
      <Accordion allowToggle>
        {keys.map((key) => {
          return (
            db.get(key) && (
              <AccordionItem>
                <p>
                  <AccordionButton>
                    <Box>
                      Block: <br />
                      {key}
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                </p>
                <AccordionPanel pb={4}>{display(db.get(key)!)}</AccordionPanel>
              </AccordionItem>
            )
          )
        })}
      </Accordion>
    )
  }

  useEffect(() => {
    setDisplay(blockAccordion())
  }, [keys])

  return (
    <Box>
      <>{_display}</>
    </Box>
  )
}
