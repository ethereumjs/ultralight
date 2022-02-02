import {
  Box,
  //   Accordion,
  //   AccordionItem,
  //   AccordionButton,
  //   AccordionIcon,
  //   AccordionPanel,
  Select,
} from '@chakra-ui/react'
import { PortalNetwork } from 'portalnetwork'
import { ReactElement, useEffect, useState } from 'react'
import DisplayBlock from './DisplayBlock'

interface BlocksToExploreProps {
  portal: PortalNetwork
  findContent: any
}

export default function BlocksToExplore(props: BlocksToExploreProps) {
  const [keys, setKeys] = useState<string[]>([])
  const [curKey, setCurKey] = useState<string>()
  const [db, setDb] = useState<Map<string, string>>(new Map())
  const [_display, setDisplay] = useState<ReactElement>()
  const [menu, setMenu] = useState<ReactElement>()
  //   const [rlpHeader, setRlpHeader] = useState<string>(
  //     '0xf90211a0d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479405a56e2d52c817161883f50c441c3228cfe54d9fa0d67e4d450343046425ae4271474353857ab860dbc0a1dde64b41b5cd3a532bf3a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008503ff80000001821388808455ba422499476574682f76312e302e302f6c696e75782f676f312e342e32a0969b900de27b6ac6a67742365dd65f55a0526c41fd18e1b16f1a1215c2e66f5988539bd4979fef1ec4'
  //   )

  const portal = props.portal

  function addNew(key: string, data: string) {
    const d = db
    d.set(key, data)
    setDb(d)
    setKeys([...keys, key])
  }

  useEffect(() => {
    portal.on('ContentAdded', (key, data) => {
      addNew(key, data)
      setCurKey(key)
    })
  }, [])

  function display(rlpHeader: string) {
    return <DisplayBlock findContent={props.findContent} rlpHeader={rlpHeader} />
  }

  //   function blockAccordion() {
  //     return (
  //       <Accordion allowToggle>
  //         {keys.map((key) => {
  //           return (
  //             db.get(key) && (
  //               <AccordionItem key={key}>
  //                 <AccordionButton>
  //                   <Box>
  //                     Block: <br />
  //                     {key}
  //                   </Box>
  //                   <AccordionIcon />
  //                 </AccordionButton>
  //                 <AccordionPanel pb={4}>{display(db.get(key)!)}</AccordionPanel>
  //               </AccordionItem>
  //             )
  //           )
  //         })}
  //       </Accordion>
  //     )
  //   }

  function selectBlock(keys: string[]) {
    return (
      <Select value={curKey} onChange={(e) => setCurKey(e.currentTarget.value)}>
        {keys.map((key, idx) => {
          return (
            <option key={idx} value={key}>
              {key}
            </option>
          )
        })}
      </Select>
    )
  }
  useEffect(() => {
    setMenu(selectBlock(keys))
  }, [keys])

  useEffect(() => {
    db.get(curKey!) && setDisplay(display(db.get(curKey!)!))
  }, [curKey])

  return (
    <Box>
      {menu && menu}
      <>{_display && _display}</>
    </Box>
  )
}
