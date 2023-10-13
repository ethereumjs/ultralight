import { Container, Stack } from '@mui/material'
import { SelfNodeInfo } from './NodeInfo'
import FunctionTabs from './FunctionTabs'

export default function Client(props: { name: string; ping: any; pong: any }) {
  const { name, ping, pong } = props
  return (
    <Container sx={{ width: '100%' }} id="Client">
      <Stack width={'100%'} direction={'column'}>
        <h1>{name}</h1>
        <Container sx={{ width: '100%' }}>
          <SelfNodeInfo />
        </Container>
        <Container sx={{ width: '100%' }}>
          <FunctionTabs ping={ping} pong={pong} />
        </Container>
      </Stack>
    </Container>
  )
}
