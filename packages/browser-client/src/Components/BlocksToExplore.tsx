import { Box, Select } from '@chakra-ui/react'
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

  const portal = props.portal

  function addNew(key: string, data: string) {
    const d = db
    d.set(key, data)
    setDb(d)
    setKeys([...keys, key])
  }

  useEffect(() => {
    portal.on('ContentAdded', (key, contentType, data) => {
      if (contentType === 0) {
        addNew(key, data)
        setCurKey(key)
      }
    })
  }, [])

  function display(rlpHeader: string) {
    return <DisplayBlock findContent={props.findContent} rlpHeader={rlpHeader} />
  }

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
