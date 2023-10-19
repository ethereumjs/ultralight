import React from 'react'
import { trpc } from '../utils/trpc'
import { Button, Container, ListItemText } from '@mui/material'
import { RPCDispatchContext } from '../Contexts/RPCContext'
import { ClientDispatchContext } from '../Contexts/ClientContext'

export default function Start() {
    const dispatch = React.useContext(ClientDispatchContext)
  const [started, setStarted] = React.useState(false)
  const [nodeId, setNodeId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const start = trpc.start.useMutation()

  const startUP = async () => {
    const client = await start.mutateAsync()
    if (client.startsWith('enr') || client === 'Already started') {
      setStarted(true)
      setNodeId(client)
      dispatch({
        type: 'CONNECTED',
      })
    } else {
      setError(client)
    }
  }

  return (
    <Container>
      <Button onClick={startUP} variant="contained" color="primary">
        Start
      </Button>
      <ListItemText primary={'STARTED'} secondary={started} />
      {nodeId && <ListItemText primary={'NODE ID'} secondary={nodeId} />}
      {error && <ListItemText primary={'ERROR'} secondary={error} />}
    </Container>
  )
}
