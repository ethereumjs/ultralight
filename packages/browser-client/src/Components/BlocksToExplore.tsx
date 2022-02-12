import { Box, Grid, GridItem, Menu, MenuItemOption, MenuOptionGroup } from '@chakra-ui/react'
import { BlockHeader } from '@ethereumjs/block'
import { getContentId, PortalNetwork } from 'portalnetwork'
import { ReactElement, useEffect, useState } from 'react'
import DisplayBlock from './DisplayBlock'

interface BlocksToExploreProps {
  portal: PortalNetwork
  findContent: any
}

export default function BlocksToExplore(props: BlocksToExploreProps) {
  const [keys, setKeys] = useState<Record<string, number>>({})
  const [curKey, setCurKey] = useState<string>()
  const [_display, setDisplay] = useState<ReactElement>()
  const [menu, setMenu] = useState<ReactElement>(<></>)

  const portal = props.portal

  function addKey(key: string, contentType: number) {
    const k = keys
    k[key] = contentType
    setKeys(k)
  }

  async function handleChangeKey(key: string) {
    setCurKey(key)
    const headerLookupKey = getContentId(1, key, keys[key])
    const _header = await portal.db.get(headerLookupKey)
    const header = BlockHeader.fromRLPSerializedHeader(_header)
    setDisplay(<DisplayBlock header={header.toJSON()} />)
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    portal.on('ContentAdded', async (key, contentType, data) => {
      addKey(key, contentType)
      setMenu(
        <Menu>
          <MenuOptionGroup onChange={(k) => handleChangeKey(k as string)}>
            {Object.keys(keys).map((key, idx) => {
              return (
                <MenuItemOption key={idx} value={key}>
                  {key.slice(0, 12)}...
                </MenuItemOption>
              )
            })}
          </MenuOptionGroup>
        </Menu>
      )
      await handleChangeKey(key)
    })
  }, [])

  function selectBlock(keys: string[]) {
    return curKey ? (
      <Menu>
        <MenuOptionGroup defaultValue={curKey} onChange={(k) => handleChangeKey(k as string)}>
          {keys.map((key, idx) => {
            return (
              <MenuItemOption key={idx} value={key}>
                {key.slice(0, 12)}...
              </MenuItemOption>
            )
          })}
        </MenuOptionGroup>
      </Menu>
    ) : (
      <></>
    )
  }

  useEffect(() => {
    keys && setMenu(selectBlock(Object.keys(keys)))
  }, [keys])

  return (
    <Grid templateColumns={'repeat(12, 1fr)'} outline={'solid black'} alignItems={'start'}>
      <GridItem colSpan={2}>
        <Box style={{ paddingBottom: '500%' }} borderColor={'black'} borderWidth={'thin'}>
          {menu && menu}
        </Box>
      </GridItem>
      <GridItem colStart={4} colSpan={9}>
        <Box>{_display}</Box>
      </GridItem>
    </Grid>
  )
}
