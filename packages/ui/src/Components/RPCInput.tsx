import {
  List,
  ListItem,
  FormControl,
  FormHelperText,
  TextareaAutosize,
  Checkbox,
  FormControlLabel,
  FormGroup,
  ListItemText,
  Avatar,
  IconButton,
  ListItemAvatar,
  Alert,
  Snackbar,
  TextField,
  Autocomplete,
  Stack,
  ListSubheader,
} from '@mui/material'
import React, { ChangeEvent, useEffect } from 'react'
import z from 'zod'
import { RPCContext, RPCDispatchContext } from '../Contexts/RPCContext'
import { decodeTxt } from '../utils/enr'
import { ClientContext } from '../Contexts/ClientContext'
import { RPCMethod } from './RPC'
import SuperJSON from 'superjson'

const keyParser = z
  .string()
  .transform((val) => (val.startsWith('0x') ? val : '0x' + val))
  .refine((val) => BigInt(val).toString(16) === val.slice(2))

export default function RPCInput(props: { method: RPCMethod }) {
  switch (props.method) {
    case 'portal_historyPing': {
      return <InputEnr />
    }
    case 'portal_historyFindNodes': {
      return (
        <Stack direction={'column'}>
          <InputNodeId />
          <InputDistances />
        </Stack>
      )
    }
    case 'portal_historyFindContent': {
      return (
        <Stack direction={'column'}>
          <InputNodeId />
          <InputContentKey />
        </Stack>
      )
    }
    case 'portal_historyRecursiveFindContent': {
      return (
        <Stack direction={'column'}>
          <InputContentKey />
        </Stack>
      )
    }
    case 'portal_historyOffer': {
      return (
        <Stack direction={'column'}>
          <InputNodeId />
          <InputContentKey />
          <InputContent />
        </Stack>
      )
    }
    case 'portal_historySendOffer': {
      return (
        <Stack direction={'column'}>
          <InputNodeId />
          <InputContentKeyArray />
        </Stack>
      )
    }
    case 'portal_historyGossip': {
      return (
        <Stack direction={'column'}>
          <InputNodeId />
          <InputContentKey />
          <InputContent />
        </Stack>
      )
    }
    case 'eth_getBlockByHash': {
      return <InputBlockHash />
    }
    case 'eth_getBlockByNumber': {
      return <InputBlockNumber />
    }
    default: {
      return <></>
    }
  }
}

export function InputBlockHash() {
  const dispatch = React.useContext(RPCDispatchContext)
  const [valid, setValid] = React.useState<boolean | undefined>()
  const [cur, setCur] = React.useState('')
  const setBlockHash = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const blockHash = e.target.value
    if (blockHash.length === 0) {
      setValid(undefined)
    }
    setCur(blockHash)
    try {
      keyParser.refine((val) => val.length === 66).parse(blockHash)
      setValid(true)
      dispatch({
        type: 'BLOCK_HASH',
        blockHash: blockHash,
      })
    } catch {
      setValid(false)
    }
  }
  return (
    <FormControl fullWidth>
      <FormHelperText>BlockHash</FormHelperText>
      <TextField placeholder="blockHash" value={cur} onChange={setBlockHash} />
    </FormControl>
  )
}

export function InputBlockNumber() {
  const dispatch = React.useContext(RPCDispatchContext)
  const [valid, setValid] = React.useState<boolean | undefined>()
  const [cur, setCur] = React.useState('')
  const setBlockNumber = (e: ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const value = BigInt(e.target.value)
      const blockNumber = z.bigint().min(0n).parse(value).toString()
      setCur(blockNumber)
      dispatch({
        type: 'BLOCK_NUMBER',
        blockNumber: blockNumber,
      })
      setValid(true)
    } catch {
      setValid(false)
    }
  }
  return (
    <FormControl fullWidth>
      <FormHelperText>BlockNumber (int or hex)</FormHelperText>
      <TextField placeholder="0x0" value={cur} onChange={setBlockNumber} />
    </FormControl>
  )
}

export function SelectContentKey() {
  const { CONTENT_STORE } = React.useContext(ClientContext)
  const dispatch = React.useContext(RPCDispatchContext)
  const [value, setValue] = React.useState<string | null>(null)

  useEffect(() => {
    dispatch({
      type: 'CONTENT_KEY',
      contentKey: value,
    })
  }, [value])

  return (
    <Autocomplete
      selectOnFocus
      clearOnBlur
      handleHomeEndKeys
      id="select-key"
      onChange={(event, newValue) => {
        setValue(newValue)
      }}
      options={Object.keys(CONTENT_STORE)}
      getOptionLabel={(option) => option}
      defaultValue={Object.keys(CONTENT_STORE)[0] ?? 'ContentKeys'}
      filterSelectedOptions
      renderInput={(params) => (
        <TextField {...params} label="ContentKeys" placeholder="ContentKey" />
      )}
    />
  )
}
export function SelectContentKeyArray() {
  const { CONTENT_STORE } = React.useContext(ClientContext)
  const dispatch = React.useContext(RPCDispatchContext)
  const [value, setValue] = React.useState<string[]>([])

  useEffect(() => {
    dispatch({
      type: 'CONTENT_KEY_ARRAY',
      contentKeyArray: value,
    })
  }, [value])

  return (
    <Autocomplete
      multiple
      id="select-multiple-keys"
      onChange={(event, newValue) => {
        setValue(newValue)
      }}
      options={Object.keys(CONTENT_STORE)}
      getOptionLabel={(option) => option}
      defaultValue={[]}
      filterSelectedOptions
      renderInput={(params) => (
        <TextField {...params} label="ContentKeys" placeholder="ContentKey" />
      )}
    />
  )
}

export function InputContentKey() {
  const dispatch = React.useContext(RPCDispatchContext)
  const [cur, setCur] = React.useState('')
  const [valid, setValid] = React.useState<boolean | undefined>(undefined)
  const setContentKey = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const contentKey = e.target.value
    if (contentKey.length === 0) {
      setValid(undefined)
    }
    setCur(contentKey)
    try {
      keyParser.parse(contentKey)
      setValid(true)
      dispatch({
        type: 'CONTENT_KEY',
        contentKey: contentKey,
      })
    } catch {
      setValid(false)
    }
  }
  return (
    <FormControl fullWidth>
      <FormHelperText>ContentKey</FormHelperText>
      <TextField error={valid === false} placeholder="contentKey" value={cur} onChange={setContentKey} />
    </FormControl>
  )
}

export function InputContent() {
  const { CONTENT } = React.useContext(RPCContext)
  const dispatch = React.useContext(RPCDispatchContext)
  return (
    <FormControl fullWidth>
      <FormHelperText>Content</FormHelperText>
      <TextField
        multiline
        placeholder="content"
        value={CONTENT}
        onChange={(e) =>
          dispatch({
            type: 'CONTENT',
            content: e.target.value,
          })
        }
      />
    </FormControl>
  )
}

export function InputEnr() {
  const [cur, setCur] = React.useState('')
  const [valid, setValid] = React.useState<boolean | undefined>()
  const { ROUTING_TABLE } = React.useContext(ClientContext)
  const dispatch = React.useContext(RPCDispatchContext)

  function setEnr(e: string) {
    setCur(e)
    if (cur.length === 0) {
      setValid(undefined)
      return
    }
    try {
      z.string().startsWith('enr:').parse(cur)
      dispatch({
        type: 'ENR',
        enr: cur,
      })
      try {
        decodeTxt(cur)
        setValid(true)
      } catch {
        setValid(false)
      }
    } catch {
      setValid(false)
    }
  }

  return (
    <Stack direction={'column'}>
      <FormControl fullWidth>
        <Autocomplete
          onInputChange={(_, newInputValue) => {
            setEnr(newInputValue)
          }}
          onChange={(_, newValue) => {
            if (!newValue) return
            setEnr(newValue)
          }}
          freeSolo
          selectOnFocus
          clearOnBlur
          handleHomeEndKeys
          id="select-enr"
          options={Object.values(ROUTING_TABLE).map(([, , enr]) => enr)}
          getOptionLabel={(option) => option}
          filterSelectedOptions
          renderInput={(params) => <TextField {...params} label="Node ENR" />}
        />
      </FormControl>
    </Stack>
  )
}

export function InputNodeId() {
  const { ROUTING_TABLE } = React.useContext(ClientContext)
  const dispatch = React.useContext(RPCDispatchContext)
  const [valid, setValid] = React.useState<boolean | undefined>()
  const [error, setError] = React.useState('')
  const [cur, setCur] = React.useState('')

  const onChangeInput = (nodeId: string) => {
    if (nodeId.length === 0) {
      setValid(undefined)
      return
    }
    try {
      setCur(keyParser.parse(nodeId))
    } catch {
      setValid(false)
      setError('NodeId must be valid hex string')
      setCur('')
      setNodeId('')
    }
  }

  const setNodeId = (nodeId: string) => {
    dispatch({
      type: 'NODEID',
      nodeId: nodeId,
    })
  }

  useEffect(() => {
    if (cur.length === 66) {
      setValid(true)
      setNodeId(cur)
    } else {
      setValid(false)
      setError('NodeId must be 32 bytes')
    }
  }, [cur])

  return (
    <FormControl fullWidth>
      <FormHelperText>{cur}</FormHelperText>
      <Autocomplete
        freeSolo
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        id="select-nodeId"
        options={Object.values(ROUTING_TABLE).map(([, , nodeId]) => nodeId)}
        getOptionLabel={(option) => option}
        defaultValue={''}
        onChange={(_, newValue) => {
          if (!newValue) return
          setNodeId(newValue)
        }}
        onInputChange={(_, newInputValue) => {
          onChangeInput(newInputValue)
        }}
        filterSelectedOptions
        renderInput={(params) => (
          <TextField error={valid === false} onError={() => {}} {...params} label="NodeId" />
        )}
      />
      {valid === false && <FormHelperText error>{error}</FormHelperText>}
    </FormControl>
  )
}

export function InputDistances() {
  const dispatch = React.useContext(RPCDispatchContext)

  function setDistances(distances: number[]) {
    dispatch({
      type: 'DISTANCES',
      distances,
    })
  }

  return (
    <Stack direction={'column'}>
      <FormControl fullWidth>
        <Autocomplete
          multiple
          id="distances"
          options={Array.from({ length: 256 }, (_, i) => i).reverse()}
          getOptionLabel={(option) => option.toString()}
          defaultValue={[]}
          onChange={(event, newValue) => {
            setDistances(newValue)
          }}
          selectOnFocus
          clearOnBlur
          handleHomeEndKeys
          renderInput={(params) => <TextField {...params} variant="standard" placeholder="Dist" />}
        />
      </FormControl>
    </Stack>
  )
}

export function InputContentKeyArray() {
  const { CONTENT_STORE } = React.useContext(ClientContext)
  const dispatch = React.useContext(RPCDispatchContext)
  const [arrayStr, setArrayStr] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState('Invalid ContentKey')
  const [contentKeyArray, setContentKeyArray] = React.useState<string[]>([])
  const keyArrParser = z.array(keyParser)

  const handleClose = () => {
    setOpen(false)
  }

  const setInputArray = (e: ChangeEvent<HTMLTextAreaElement>) => {
    let arrayStr = e.target.value
    if (!arrayStr.startsWith('[')) {
      arrayStr = '[' + arrayStr
    }
    if (!arrayStr.endsWith(']')) {
      arrayStr = arrayStr + ']'
    }
    const array = JSON.parse(arrayStr)
    setArrayStr(JSON.stringify(array))
    try {
      keyArrParser.parse(array)
      setContentKeyArray(array)
      inputKeyArray()
    } catch {
      //
    }
  }

  const inputKeyArray = () => {
    try {
      const keyArr = keyArrParser.parse(contentKeyArray)
      dispatch({
        type: 'CONTENT_KEY_ARRAY',
        contentKeyArray: keyArr,
      })
    } catch (err: any) {
      setErrorMsg(`Invalid ContentKey Array: err.message`)
      setOpen(true)
    }
  }

  return (
    <FormControl fullWidth>
      <FormHelperText>ContentKey Array</FormHelperText>
      <TextField
        multiline
        placeholder={`["0x00abcd", "0x01abcd"]`}
        value={arrayStr}
        onChange={setInputArray}
      />
      <FormHelperText>Add ContentKey</FormHelperText>
      <Autocomplete
        multiple
        onChange={(_, newValue) => {
          setArrayStr(JSON.stringify(newValue))
          setContentKeyArray(newValue)
          inputKeyArray()
        }}
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        id="select-multiple-keys"
        options={Object.keys(CONTENT_STORE)}
        getOptionLabel={(option) => option}
        defaultValue={[]}
        filterSelectedOptions
        renderInput={(params) => (
          <TextField {...params} label="ContentKey" placeholder="ContentKey" />
        )}
      />
      <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="error" sx={{ width: '100%' }}>
          {errorMsg}
        </Alert>
      </Snackbar>
    </FormControl>
  )
}
