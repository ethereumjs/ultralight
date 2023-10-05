import {
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  TextField,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  MenuItem,
  Alert,
  AlertTitle,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import { CheckmarkIcon } from 'react-hot-toast'
import React from 'react'
import { ClientContext } from '../Contexts/ClientContext';

export default function Ping(props: { ping: any; pong: any; }) {
  const state = React.useContext(ClientContext)
  const { ping, pong } = props
  const [open, setOpen] = React.useState(false)
  const [alert, setAlert] = React.useState<'closed' | 'open' | 'success' | 'fail'>('closed')
  const [toPing, setToPing] = React.useState<string>('')
  const [peer, setPeer] = React.useState<string>('')
  const handleClick = () => {
    ping(toPing)
    setAlert('open')
    setOpen(true)
    setTimeout(() => {
      if (pong) {
        setAlert('success')
      } else {
        setAlert('fail')
      }
      setTimeout(() => {
        setOpen(false)
        setAlert('closed')
      }, 2000)
    }, 1000)
  }
  const setEnr = (enr: string) => {
    if (enr.startsWith('enr:')) {
      setToPing(enr)
    }
  }

  const handleChangePeer = (event: SelectChangeEvent) => {
    setPeer(event.target.value as string)
    setToPing(event.target.value as string)
  }

  return (
    <List disablePadding>
      {open && alert === 'fail' ? (
        <Alert severity="warning">
          <AlertTitle>Fail</AlertTitle>
          Ping Pong Failed<strong>{toPing.slice(0,16)}...</strong>
        </Alert>
      ) : open && alert === 'success' ? (
        <Alert severity="success">
          <AlertTitle>Pong</AlertTitle>
          Ping Pong Success<strong>{toPing.slice(0,16)}...</strong>
        </Alert>
      ) : (
        open && (
          <Alert severity="info">
            <AlertTitle>Pinging</AlertTitle>
            Pinging -- <strong>* {toPing.slice(0,16)}...</strong>
          </Alert>
        )
      )}
      <ListItemButton onClick={handleClick}>
        <ListItemIcon>{pong ? <CheckmarkIcon /> : <SendIcon />}</ListItemIcon>
        <ListItemText primary="Send Ping" secondary={toPing.slice(0,16)} />
      </ListItemButton>
      <ListItemButton sx={{ pl: 4 }}>
        <TextField
          fullWidth
          onChange={(e) => setEnr(e.target.value)}
          value={toPing}
          placeholder="enr:IS4Q..."
        />
      </ListItemButton>
      <ListItem>
        <FormControl fullWidth>
          <InputLabel id="peers-label">Peers</InputLabel>
          <Select
            labelId="peers-label"
            id="select peer"
            value={peer}
            label="Peer"
            onChange={handleChangePeer}
          >
            {Object.values(state.ROUTING_TABLE).map(([tag, enr, nodeid, ma, b]) => (
              <MenuItem key={enr} value={enr}>
                {enr}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </ListItem>
      {pong && (
        <ListItem>
          <ListItemText>customPayload</ListItemText>
          <ListItemText>
            {pong.customPayload.slice(0, 5)}...{pong.customPayload.slice(-5)}
          </ListItemText>
          <ListItemText>enrSeq:</ListItemText>
          <ListItemText>{pong.enrSeq}</ListItemText>
        </ListItem>
      )}
    </List>
  )
}
