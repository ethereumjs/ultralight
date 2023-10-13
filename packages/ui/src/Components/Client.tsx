import { Container, ListItemText, Stack } from '@mui/material'
import { SelfNodeInfo } from './NodeInfo'
import FunctionTabs from './FunctionTabs'
import PortMenu from './Port'

export default function Client(props: { name: string; }) {
  return (
    <Container sx={{ width: '100%' }} id="Client">
      <Stack width={'100%'} direction={'column'}>
        <ListItemText primary={props.name} />
        {props.name === 'HTTP Client' && <PortMenu />}
        <Container sx={{ width: '100%' }}>
          <SelfNodeInfo />
        </Container>
        <Container sx={{ width: '100%' }}>
          <FunctionTabs />
        </Container>
      </Stack>
    </Container>
  )
}
