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
  Box,
  Button,
  CircularProgress,
  Fade,
  Typography,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import { CheckmarkIcon } from 'react-hot-toast'
import React, { useEffect } from 'react'
import { ClientContext } from '../Contexts/ClientContext'
import { RPCContext } from '../Contexts/RPCContext'

export default function Ping() {
  const state = React.useContext(ClientContext)
  const rpc = React.useContext(RPCContext)
  const [pong, setPong] = React.useState<any>(null)
  const ping = rpc.REQUEST.portal_historyPing.useMutation()
  const [open, setOpen] = React.useState(false)
  const [alert, setAlert] = React.useState<'closed' | 'open' | 'success' | 'fail'>('closed')
  const [toPing, setToPing] = React.useState<string>('')
  const [peer, setPeer] = React.useState<string>('')
  const [pinging, setPinging] = React.useState('')
  const handleClick = async () => {
    setPinging(toPing)
    const pong = await ping.mutateAsync({ enr: toPing, port: rpc.PORT })
    setPong(pong)
    setAlert('open')
  }
  const setEnr = (enr: string) => {
    setToPing(enr)
  }

  useEffect(() => {
    if (!open) return
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
  }, [open])

  const handleChangePeer = (event: SelectChangeEvent) => {
    setPeer(event.target.value as string)
    setToPing(event.target.value as string)
  }
  const [query, setQuery] = React.useState('idle')
  const timerRef = React.useRef<number>()

  React.useEffect(
    () => () => {
      clearTimeout(timerRef.current)
    },
    [],
  )

  const handleClickQuery = () => {
    handleClick()
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    if (query !== 'idle') {
      setQuery('idle')
      return
    }

    setQuery('progress')
    timerRef.current = window.setTimeout(() => {
      if (pong) {
        setQuery('success')
      } else {
        setQuery('fail')
      }
    }, 2000)
  }

  useEffect(() => {
    if (query === 'success' || query === 'fail') {
      timerRef.current = window.setTimeout(() => {
        setQuery('idle')
      }, 2000)
    }
  }, [query])

  return (
    <List disablePadding>
      {open && alert === 'fail' ? (
        <Alert severity="warning">
          <AlertTitle>Fail</AlertTitle>
          Ping Pong Failed<strong>{toPing.slice(0, 16)}...</strong>
        </Alert>
      ) : open && alert === 'success' ? (
        <Alert severity="success">
          <AlertTitle>Pong</AlertTitle>
          Ping Pong Success<strong>{toPing.slice(0, 16)}...</strong>
        </Alert>
      ) : (
        open && (
          <Alert severity="info">
            <AlertTitle>Pinging</AlertTitle>
            Pinging -- <strong>* {toPing.slice(0, 16)}...</strong>
          </Alert>
        )
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ height: 40 }}>
          {query === 'success' ? (
            <Typography>Pong Received!</Typography>
          ) : (
            <Fade
              in={query === 'progress'}
              style={{
                transitionDelay: query === 'progress' ? '800ms' : '0ms',
              }}
              unmountOnExit
            >
              <CircularProgress />
            </Fade>
          )}
        </Box>
        <Button variant='outlined' onClick={handleClickQuery} sx={{ m: 2 }}>
          {query !== 'idle' ? 'Reset' : 'Send Ping'}
        </Button>
      </Box>
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
            <MenuItem key={'emtpy'} value={''}>
              {' '}
            </MenuItem>
            {Object.values(state.ROUTING_TABLE).map(([tag, enr, nodeId, ma, b]) => (
              <MenuItem key={enr} value={enr}>
                0x{nodeId}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </ListItem>
      {pong && (
        <>
          <ListItemText
            sx={{ textAlign: 'center' }}
            primary={`PONG received`}
            secondary={pinging}
          />
          <ListItemText primary="dataRadius" secondary={pong.dataRadius} />
          <ListItemText primary="enrSeq" secondary={pong.enrSeq} />
        </>
      )}
    </List>
  )
}
