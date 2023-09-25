import {
  Box,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  List,
} from '@mui/material'
import Refresh from '@mui/icons-material/Refresh'
import React, { useEffect } from 'react'

export default function GetBeacon() {
  const [root, setRoot] = React.useState('')

  const handleRefresh = () => {
    let n = '0x'
    for (let i = 0; i < 4; i++) {
      n += Math.floor(Math.random() * 2 ** 16).toString(16)
    }
    n += '...'
    setRoot(n)
  }

  useEffect(() => {
    handleRefresh()
  }, [])

  return (
    <Box>
        <List>
          <ListItem>
            <ListItemButton onClick={handleRefresh}>
              <ListItemIcon>
                <Refresh />
              </ListItemIcon>
            <ListItemText>StateRoot:</ListItemText>
            </ListItemButton>
            <ListItemText>{root}</ListItemText>
          </ListItem>
        </List>
    </Box>
  )
}
