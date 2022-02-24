import { Button, Grid, GridItem, Heading, Input, useToast } from '@chakra-ui/react'
import { Block } from '@ethereumjs/block'
import { PortalNetwork, SubNetworkIds } from 'portalnetwork'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import BlocksToExplore from './BlocksToExplore'
import { ContentManager } from './ContentManager'

interface FindContentProps {
  portal: PortalNetwork
  network: SubNetworkIds
  finding: string | undefined
  setBlock: Dispatch<SetStateAction<Block | undefined>>
}

export default function FindContent(props: FindContentProps) {
  const [contentKey, setContentKey] = useState<string>(
    '0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'
  )

  const toast = useToast()

  const handleFindContent = async () => {
    if (contentKey.slice(0, 2) !== '0x') {
      setContentKey('')
      toast({
        title: 'Error',
        description: 'Block Hash must be hex prefixed string',
        status: 'error',
        duration: 3000,
      })
      return
    }
    const res = await props.portal.contentLookup(0, contentKey)
    if (typeof res === 'string') {
      toast({
        title: 'Found what we were looking for',
        description: res,
        status: 'success',
        duration: 3000,
      })
    }
  }

  useEffect(() => {
    props.finding && setContentKey(props.finding)
  }, [props.finding])

  return (
    <Grid rowGap={2} templateColumns={'repeat(12, 1fr'}>
      <GridItem colSpan={12}>
        <Heading paddingTop={2} textAlign={'center'} size="md">
          Content Manager
        </Heading>
      </GridItem>
      <GridItem colSpan={12} rowStart={2}>
        <Input type={'text'} placeholder={'No File Selected'} readOnly />
      </GridItem>
      <GridItem rowStart={3} colSpan={12}>
        {props.portal && <ContentManager portal={props.portal} />}
      </GridItem>
      <GridItem rowStart={4} colSpan={12} w={'100%'} h={'10'}>
        <Input
          placeholder={'Block Hash'}
          value={contentKey}
          onChange={(evt) => {
            setContentKey(evt.target.value)
          }}
        />
      </GridItem>
      <GridItem rowStart={5}>
        <Button onClick={() => handleFindContent()}>Send Find Content Request</Button>
      </GridItem>
      <GridItem rowStart={6} colSpan={12}>
        <Heading textAlign={'center'} paddingTop={2} size={'sm'}>
          Database
        </Heading>
      </GridItem>
      <GridItem rowStart={7} colSpan={12}>
        <BlocksToExplore
          setBlock={props.setBlock}
          findContent={handleFindContent}
          portal={props.portal}
        />
      </GridItem>
    </Grid>
  )
}
