import React from 'react'
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Divider,
  Heading,
} from '@chakra-ui/react'
import PortalInfo from './PortalInfo'
import Implementations from './Implementations'
import UltralightGuide from './UltralightGuide'

export default function InfoMenu() {
  const topics = ['Ultralight Guide', 'Portal Network', 'Implementations']
  const contents = [<UltralightGuide />, <PortalInfo />, <Implementations />]

  return (
    <Box margin="15px">
      <Heading borderBottom="2px">Portal Network Details</Heading>
      <Accordion allowToggle allowMultiple mt="5px" size={'sm'}>
        {topics.map((topic, idx) => {
          return (
            <React.Fragment key={topic + idx}>
              <AccordionItem>
                <AccordionButton>
                  {topic}
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel>{contents[idx]}</AccordionPanel>
              </AccordionItem>
              <Divider />
            </React.Fragment>
          )
        })}
      </Accordion>
    </Box>
  )
}
