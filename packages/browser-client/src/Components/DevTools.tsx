import { Share } from '@capacitor/share'
import { Button, Center, Input, useToast, VStack } from '@chakra-ui/react'
import { ENR, ProtocolId } from 'portalnetwork'
import React, { Dispatch, SetStateAction, useContext, useState } from 'react'
import { PortalContext } from '../App'
import ContentManager from './ContentManager'

interface DevToolsProps {
  peers: ENR[]
  copy: () => Promise<void>
  enr: string
  peerEnr: string
  setPeerEnr: Dispatch<SetStateAction<string>>
  handleClick: () => Promise<void>
  native: boolean
}

export default function DevTools(props: DevToolsProps) {
  const portal = useContext(PortalContext)
  const [canShare, setCanShare] = useState(false)
  const toast = useToast()

  async function share() {
    await Share.share({
      title: `Ultralight ENR`,
      text: props.enr,
      dialogTitle: `Share ENR`,
    })
  }

  async function handleCopy() {
    await props.copy()
    toast({
      title: `ENR copied`,
      status: 'success',
      duration: 1500,
      isClosable: true,
      position: 'bottom-right',
      variant: 'solid',
    })
  }

  async function sharing() {
    const s = await Share.canShare()
    setCanShare(s.value)
  }

  React.useEffect(() => {
    sharing()
  }, [])

  const addBootNode = () => {
    portal.protocols.get(ProtocolId.HistoryNetwork)!.addBootNode(props.peerEnr)
  }

  return (
    <VStack>
      {canShare ? (
        <Button width={`100%`} onClick={share}>
          SHARE ENR
        </Button>
      ) : (
        <Button onClick={async () => handleCopy()} width={'100%'}>
          COPY ENR
        </Button>
      )}
      <ContentManager />

      {props.native ? (
        <Center>
          <VStack>
            <Button
              isDisabled={!props.peerEnr.startsWith('enr:')}
              width={'100%'}
              onClick={addBootNode}
            >
              Connect To Node
            </Button>
            <Input
              width={'100%'}
              bg="whiteAlpha.800"
              value={props.peerEnr}
              placeholder={'Node ENR'}
              onChange={(evt) => props.setPeerEnr(evt.target.value)}
            />
          </VStack>
        </Center>
      ) : (
        <VStack width={'100%'} spacing={0} border="1px" borderRadius={'0.375rem'}>
          <Input
            size="sm"
            bg="whiteAlpha.800"
            value={props.peerEnr}
            placeholder="Node ENR"
            onChange={(evt) => props.setPeerEnr(evt.target.value)}
            mb={2}
          />
          <Button width={'100%'} onClick={props.handleClick}>
            Connect To Node
          </Button>
        </VStack>
      )}
    </VStack>
  )
}
