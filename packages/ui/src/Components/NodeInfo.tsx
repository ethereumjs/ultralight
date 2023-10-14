import * as React from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import { Box, TableSortLabel } from '@mui/material'
import { ClientContext, ClientDispatchContext } from '../Contexts/ClientContext'
import { RPCContext, RPCDispatchContext } from '../Contexts/RPCContext'

function createRow(tag: string, enr: string, nodeId: string, multiAddr: string, bucket: number) {
  return { tag, enr, nodeId, multiAddr, bucket }
}

export function SelfNodeInfo() {
  const state = React.useContext(ClientContext)
  const dispatch = React.useContext(ClientDispatchContext)
  const rpc = React.useContext(RPCContext)
  const rpcDispatch = React.useContext(RPCDispatchContext)
  const { tag, enr, nodeId, multiAddr } = state.NODE_INFO

  const row = createRow(tag, enr, nodeId, multiAddr, 0)
  const nodeInfo = rpc.REQUEST.discv5_nodeInfo.useMutation()
  const getNodeInfo = async () => {
    const info =
      state.CONNECTION === 'http'
        ? await nodeInfo.mutateAsync({ port: rpc.PORT })
        : await nodeInfo.mutateAsync({})
    dispatch({
      type: 'NODE_INFO',
      ...info,
    })
  }
  React.useEffect(() => {
    getNodeInfo()
  }, [])
  React.useEffect(() => {
    getNodeInfo()
  }, [rpc.PORT, rpc.IP])
  return (
    <TableContainer sx={{ width: '100%' }} component={Paper}>
      <Table sx={{ width: '100%' }} size="small" aria-label="self node info">
        <TableHead>
          <TableRow>
            <TableCell>{row.tag}</TableCell>
            <TableCell>{row.enr}</TableCell>
            <TableCell align="right">{row.nodeId}</TableCell>
            <TableCell align="right">{row.multiAddr}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody></TableBody>
      </Table>
    </TableContainer>
  )
}
export default function NodeInfo() {
  const state = React.useContext(ClientContext)
  const [sort, setSort] = React.useState('')
  const [order, setOrder] = React.useState<'asc' | 'desc'>('asc')
  const [rows, setRows] = React.useState(
    (Object.values(state.ROUTING_TABLE) as [string, string, string, string, number][]).map(
      ([tag, enr, nodeId, multiAddr, bucket]) => createRow(tag, enr, nodeId, multiAddr, bucket),
    ),
  )
  function handleSort(sortBy: string) {
    if (sortBy === sort) {
      setOrder(order === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(sortBy)
      setOrder('asc')
    }
    const sorted = rt().sort(
      (
        [clientA, enrA, nodeIdA, multiAddrA, bucketA],
        [clientB, enrB, nodeIdB, multiAddrB, bucketB],
      ) => {
        switch (sortBy) {
          case 'kBucket':
            return order === 'asc' ? bucketA - bucketB : bucketB - bucketA
          case 'NodeId':
            return order === 'asc' ? nodeIdA.localeCompare(nodeIdB) : nodeIdB.localeCompare(nodeIdA)
          case 'Client':
            return order === 'asc' ? clientA.localeCompare(clientB) : clientB.localeCompare(clientA)
          case 'MultiAddr':
            return order === 'asc'
              ? multiAddrA.localeCompare(multiAddrB)
              : multiAddrB.localeCompare(multiAddrA)
          case 'ENR':
            return order === 'asc' ? enrA.localeCompare(enrB) : enrB.localeCompare(enrA)
          default:
            return order === 'asc' ? bucketA - bucketB : bucketB - bucketA
        }
      },
    )

    setRows(
      sorted.map(([tag, enr, nodeId, multiAddr, bucket]) =>
        createRow(tag, enr, nodeId, multiAddr, bucket),
      ),
    )
  }

  function rt() {
    return Object.values(state.ROUTING_TABLE) as [string, string, string, string, number][]
  }

  // switch (state.CONNECTION) {
  //   case 'ws': {
  React.useEffect(() => {
    setRows(
      rt().map(([tag, enr, nodeId, multiAddr, bucket]) =>
        createRow(tag, enr, nodeId, multiAddr, bucket),
      ),
    )
  }, [state.ROUTING_TABLE])
  return (
    <Box overflow="hidden">
      <TableContainer sx={{ maxHeight: 500 }} component={Paper}>
        <Table stickyHeader size="small" aria-label="node info">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sort === 'Client'}
                  direction={order}
                  onClick={() => handleSort('Client')}
                  hideSortIcon
                >
                  Client
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sort === 'ENR'}
                  direction={order}
                  onClick={() => handleSort('ENR')}
                  hideSortIcon
                >
                  ENR
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sort === 'NodeId'}
                  direction={order}
                  onClick={() => handleSort('NodeId')}
                  hideSortIcon
                >
                  NodeId
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sort === 'MultiAddr'}
                  direction={order}
                  onClick={() => handleSort('MultiAddr')}
                  hideSortIcon
                >
                  MultiAddr
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sort === 'kBucket'}
                  direction={order}
                  onClick={() => handleSort('kBucket')}
                  hideSortIcon
                >
                  kBucket
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>{row.tag}</TableCell>
                <TableCell>{row.enr.slice(0, 16)}...</TableCell>
                <TableCell align="right">{row.nodeId.slice(0, 12)}...</TableCell>
                <TableCell align="right">{row.multiAddr}</TableCell>
                <TableCell align="right">{row.bucket}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
  // }
  // case 'http': {
  //   const rt = Object.values(state.ROUTING_TABLE)
  //   return (
  //     <Box overflow="hidden">
  //       <TableContainer sx={{ maxHeight: 500 }} component={Paper}>
  //         <Table stickyHeader padding="none" aria-label="node info">
  //           <TableHead>
  //             <TableRow>
  //               <TableCell>
  //                 <TableSortLabel hideSortIcon active={sort === 'kBucket'} direction={order} onClick={() => handleSort('kBucket')}>
  //                   kBucket
  //                 </TableSortLabel>
  //               </TableCell>
  //               <TableCell>
  //                 <TableSortLabel hideSortIcon active={sort === 'NodeId'} direction={order} onClick={() => handleSort('NodeId')}>
  //                   NodeId
  //                 </TableSortLabel>
  //               </TableCell>
  //             </TableRow>
  //           </TableHead>
  //           <TableBody>
  //             {rt
  //               .sort(([nodeA, bucketA], [nodeB, bucketB]) =>
  //                 sort === 'kBucket'
  //                   ? order === 'asc'
  //                     ? parseInt(bucketA as string) - parseInt(bucketB as string)
  //                     : parseInt(bucketB as string) - parseInt(bucketA as string)
  //                   : nodeA > nodeB
  //                   ? order === 'asc'
  //                     ? 1
  //                     : -1
  //                   : order === 'asc'
  //                   ? -1
  //                   : 1,
  //               )
  //               .map(([nodeId, bucket], idx) => (
  //                 <TableRow key={idx}>
  //                   <TableCell align="left">{256 - parseInt(bucket as string)}</TableCell>
  //                   <TableCell align="left">0x{nodeId}</TableCell>
  //                 </TableRow>
  //               ))}
  //           </TableBody>
  //         </Table>
  //       </TableContainer>
  //     </Box>
  //   )
  // }
  // }
}
