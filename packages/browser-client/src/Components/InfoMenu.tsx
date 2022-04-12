import React, { Dispatch, SetStateAction } from 'react'
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Divider,
} from '@chakra-ui/react'
import PortalInfo from './PortalInfo'
import Implementations from './Implementations'
import UltralightGuide from './UltralightGuide'

export default function InfoMenu() {
  const topics = ['Ultralight Guide', 'Portal Network', 'Implementations']
  const contents = [<UltralightGuide />, <PortalInfo />, <Implementations />]

  return (
    <Accordion allowToggle allowMultiple size={'sm'}>
      {topics.map((topic, idx) => {
        return (
          <>
            <AccordionItem>
              <AccordionButton>
                {topic}
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel>{contents[idx] ?? <></>}</AccordionPanel>
            </AccordionItem>
            <Divider />
          </>
        )
      })}
    </Accordion>
  )
}
