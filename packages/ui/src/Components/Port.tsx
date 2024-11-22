import DropDown from '@mui/icons-material/ArrowDropDown'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemText,
  Popover,
  TextField,
} from '@mui/material'
import Button from '@mui/material/Button'
import * as React from 'react'
import { set, z } from 'zod'
import { ClientContext } from '../Contexts/ClientContext'
import { RPCContext, RPCDispatchContext } from '../Contexts/RPCContext'
import { trpc } from '../utils/trpc'

export default function PortMenu() {
  const rpc = React.useContext(RPCContext)
  const dipsatch = React.useContext(RPCDispatchContext)
  const address = trpc.getPubIp.useQuery()
  const [curIP, setCurIp] = React.useState<string>(address.data ?? '')
  const [validIp, setValidIp] = React.useState<boolean>(true)
  const [curPort, setCurPort] = React.useState(8545)
  const state = React.useContext(ClientContext)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  function handleIpInput(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      z.string().ip().parse(e.target.value)
      setValidIp(true)
    } catch {
      setValidIp(false)
    }
    setCurIp(e.target.value)
  }
  function handlePortInput(e: React.ChangeEvent<HTMLInputElement>) {
    setCurPort(parseInt(e.target.value))
  }
  function setAddr() {
    console.log('setting addr', curIP, curPort)
    dipsatch({
      type: 'PORT',
      port: curPort,
    })
    dipsatch({
      type: 'IP',
      port: curIP,
    })
    setAnchorEl(null)
  }

  const id = open ? 'simple-popover' : undefined
  return (
    <div>
      <Button
        aria-describedby={id}
        variant="contained"
        onClick={handleClick}
        endIcon={<DropDown />}
      >
        {address.data}:{rpc.PORT}
      </Button>
      <Dialog id={id} open={open} onClose={handleClose}>
        <DialogTitle>Set RPC Address</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            variant="outlined"
            autoFocus
            margin="dense"
            type="text"
            label="ip"
            id="ip input"
            value={curIP}
            onChange={handleIpInput}
            error={!validIp}
          />
          <TextField
            fullWidth
            variant="outlined"
            autoFocus
            margin="dense"
            type="number"
            label="port"
            id="port input"
            value={curPort}
            onChange={handlePortInput}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={() => setAddr()}>Set</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
