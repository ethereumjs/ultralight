import { Stack } from '@mui/material'
import { SelfNodeInfo } from './NodeInfo'
import FunctionTabs from './FunctionTabs'

export default function Client(props: {
  name: string
  ping: any
  pong: any
}) {
  const { name, ping, pong } = props
  return (
    <Stack direction={'column'}>
      <h1>{name}</h1>
      <SelfNodeInfo      />
      <FunctionTabs
        ping={ping}
        pong={pong}
      />
    </Stack>
  )
}
