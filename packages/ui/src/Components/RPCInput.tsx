import {
  FormControl,
  FormHelperText,
  Alert,
  Snackbar,
  TextField,
  Autocomplete,
  Stack,
  ListItemText,
} from '@mui/material'
import React, { ChangeEvent, useEffect } from 'react'
import z from 'zod'
import { RPCContext, RPCDispatchContext } from '../Contexts/RPCContext'
import { decodeTxt } from '../utils/enr'
import { ClientContext } from '../Contexts/ClientContext'
import { RPCMethod } from './RPC'

const nodeIdParser = z
  .string()
  .transform((val) => (val.startsWith('0x') ? val : '0x' + val))
  .refine((val) => val.length === 66)
const keyParser = z
  .string()
  .transform((val) => (val.startsWith('0x') ? val : '0x' + val))
  .refine((val) => val.length === 68)

export default function RPCInput(props: { method: RPCMethod }) {
  switch (props.method) {
    case 'portal_historyPing': {
      return <InputEnr />
    }
    case 'portal_historyFindNodes': {
      return (
        <Stack width={'100%'}  direction={'column'}>
          <InputNodeId />
          <InputDistances />
        </Stack>
      )
    }
    case 'portal_historyFindContent': {
      return (
        <Stack width={'100%'}  direction={'column'}>
          <InputNodeId />
          <InputContentKey />
        </Stack>
      )
    }
    case 'portal_historyRecursiveFindContent': {
      return (
        <Stack width={'100%'}  direction={'column'}>
          <InputContentKey />
        </Stack>
      )
    }
    case 'portal_historyOffer': {
      return (
        <Stack width={'100%'}  direction={'column'}>
          <InputNodeId />
          <InputContentKey />
          <InputContent />
        </Stack>
      )
    }
    case 'portal_historySendOffer': {
      return (
        <Stack width={'100%'} direction={'column'}>
          <InputNodeId />
          <InputContentKeyArray />
        </Stack>
      )
    }
    case 'portal_historyGossip': {
      return (
        <Stack width={'100%'}  direction={'column'}>
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
      onInputChange={(_, newInputValue) => {
        setValue(newInputValue)
      }}
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
      filterSelectedOptions
      renderInput={(params) => (
        <TextField {...params} label="ContentKeys" placeholder="Content_Key" />
      )}
    />
  )
}

export function InputContentKey() {
  const dispatch = React.useContext(RPCDispatchContext)
  const [cur, setCur] = React.useState(
    '',
  )
  const [valid, setValid] = React.useState<boolean | undefined>(undefined)
  const [keyErr, setKeyErr] = React.useState<string | undefined>(undefined)
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
      setKeyErr(undefined)
    } catch (err: any) {
      setKeyErr(err.message)
      setValid(false)
    }
  }
  return (
    <FormControl fullWidth>
      {keyErr && <ListItemText>{keyErr}</ListItemText>}
      <FormHelperText>ContentKey</FormHelperText>
      <TextField
        error={valid === false}
        placeholder="contentKey"
        value={cur}
        onChange={setContentKey}
      />
    </FormControl>
  )
}

export function InputContent() {
  const [cur, setCur] = React.useState('')
  const { CONTENT } = React.useContext(RPCContext)
  const dispatch = React.useContext(RPCDispatchContext)
  
  function setContent() {
    dispatch({
      type: 'CONTENT',
      content: cur,
    })
  }

  useEffect(() => {
    if (cur.length === 0) {
      return
    }
    setContent()
  }, [cur])
  
  return (
    <FormControl fullWidth>
      <FormHelperText>Content</FormHelperText>
      <TextField
      maxRows={10}
        multiline
        placeholder="content"
        value={cur}
        onChange={(e) =>
          setCur(e.target.value)
        }
      />
    </FormControl>
  )
}

export function InputEnr() {
  const [cur, setCur] = React.useState('')
  const [valid, setValid] = React.useState<boolean | undefined>(false)
  const { ROUTING_TABLE } = React.useContext(ClientContext)
  const dispatch = React.useContext(RPCDispatchContext)

  useEffect(() => {
    setEnr(cur)
  }, [cur])

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
        const decoded = decodeTxt(cur)
        console.log('DECODED', decoded)
        setValid(true)
      } catch {
        setValid(false)
      }
    } catch {
      setValid(false)
    }
  }

  return (
    <Stack width={'100%'}  direction={'column'}>
      <FormControl fullWidth>
        <Autocomplete
          onInputChange={(_, newInputValue) => {
            setCur(newInputValue)
          }}
          onChange={(_, newValue) => {
            if (!newValue) return
            setCur(newValue)
          }}
          freeSolo
          fullWidth
          selectOnFocus
          clearOnBlur
          handleHomeEndKeys
          id="select-enr"
          options={Object.values(ROUTING_TABLE).map(([, enr]) => enr)}
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
      setCur(nodeIdParser.parse(nodeId))
    } catch {
      setValid(false)
      setError('NodeId must be valid hex string')
      // setCur('')
      // setNodeId('')
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
      <Autocomplete
        fullWidth
        freeSolo
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        id="select-nodeId"
        options={Object.values(ROUTING_TABLE).map(([, , nodeId]) => nodeId)}
        getOptionLabel={(option) => option}
        placeholder={'Node ID'}
        onChange={(_, newValue) => {
          if (!newValue) return
          onChangeInput(newValue)
          // setNodeId(newValue)
        }}
        onInputChange={(_, newInputValue) => {
          onChangeInput(newInputValue)
        }}
        filterSelectedOptions
        renderInput={(params) => (
          <TextField error={valid === false} onError={() => {}} {...params} label="NodeId" />
        )}
      />
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
    <Stack width={'100%'}  direction={'column'}>
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
  const { CONTENT_KEY_ARRAY } = React.useContext(RPCContext)
  const dispatch = React.useContext(RPCDispatchContext)
  const [newKey, setNewKey] = React.useState<string>('')
  const [open, setOpen] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState('Invalid ContentKey')
  const [contentKeyArray, setContentKeyArray] = React.useState<string[]>([])
  const keyArrParser = z.array(keyParser)

  const handleClose = () => {
    setOpen(false)
  }

  const handleNewVlaue = (key: string | null) => {
    if (!key || CONTENT_KEY_ARRAY.includes(key)) {
      return
    }
    setInputArray([...contentKeyArray, key])
  }

  const setInputArray = (array: string[]) => {
    // setArrayStr(JSON.stringify(array))
    try {
      keyArrParser.parse(array)
      setContentKeyArray(array)
      inputKeyArray()
    } catch (err) {
      console.log('contentkeyparser error', err)
      //
    }
  }

  const inputKeyArray = () => {
    try {
      // const keyArr = keyArrParser.parse(contentKeyArray)
      console.log('content_key_array', contentKeyArray)
      console.log('CONTENT_KEY_ARRAY pre', CONTENT_KEY_ARRAY)
      dispatch({
        type: 'CONTENT_KEY_ARRAY',
        contentKeyArray: contentKeyArray,
      })
      console.log('CONTENT_KEY_ARRAY post', CONTENT_KEY_ARRAY)
    } catch (err: any) {
      setErrorMsg(`Invalid ContentKey Array: err.message`)
      setOpen(true)
    }
  }

  return (
    <FormControl fullWidth>
      <FormHelperText>Add ContentKey</FormHelperText>
      <Autocomplete
        // multiple
        onChange={(_, newValue) => {
          // setArrayStr([...contentKeyArray, newValue])
          handleNewVlaue(newValue)
          inputKeyArray()
        }}
        onInputChange={(_, newInputValue) => {
          handleNewVlaue(newInputValue)
        }}
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        id="select-multiple-keys"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            inputKeyArray()
          }
        }}
        options={[newKey, ...Object.keys(CONTENT_STORE)]}
        getOptionLabel={(option) => option}
        // defaultValue={'ContentKey'}
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
