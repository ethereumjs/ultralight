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
import { PortalNetwork } from 'portalnetwork'
import { useEffect, useState } from 'react'
import DisplayBlock from './DisplayBlock'

interface BlocksToExploreProps {
  portal: PortalNetwork
}

export default function BlocksToExplore(props: BlocksToExploreProps) {
  const [keys, setKeys] = useState<string[]>([])
  const [db, setDb] = useState<Map<string, string>>(new Map())
  // eslint-disable-next-line no-undef
  const [_display, setDisplay] = useState<JSX.Element>()
  //   const [rlpHeader, setRlpHeader] = useState<string>(
  //     '0xf90211a0d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479405a56e2d52c817161883f50c441c3228cfe54d9fa0d67e4d450343046425ae4271474353857ab860dbc0a1dde64b41b5cd3a532bf3a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008503ff80000001821388808455ba422499476574682f76312e302e302f6c696e75782f676f312e342e32a0969b900de27b6ac6a67742365dd65f55a0526c41fd18e1b16f1a1215c2e66f5988539bd4979fef1ec4'
  //   )

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

  function display(rlpHeader: string) {
    return <DisplayBlock rlpHeader={rlpHeader} />
  }

  function blockAccordion() {
    return (
      <Accordion allowToggle>
        {keys.map((key) => {
          return (
            db.get(key) && (
              <AccordionItem key={key}>
                <AccordionButton>
                  <Box>
                    Block: <br />
                    {key}
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
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
