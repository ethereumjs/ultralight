import React, { useContext, useEffect, useState } from 'react'
import {
  Box,
  MenuButton,
  Menu,
  MenuList,
  Button,
  MenuItem,
  HStack,
  FormControl,
  IconButton,
  Input,
  useToast,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ChevronDownIcon, SearchIcon } from '@chakra-ui/icons'
import { AppContext, AppContextType, StateChange } from '../globalReducer'
import { PeerActions } from '../peerActions'
import {
  ENR,
  fromHexString,
  getContentId,
  getContentKey,
  HistoryNetworkContentType,
  NetworkId,
} from 'portalnetwork'
import { PeerContext, PeerContextType, PeerStateChange } from '../peerReducer'

enum GetBy {
  find_content_header = 0,
  find_content_body = 1,
  find_nodes = 2,
  offer_content = 3,
  find_content_epoch = 4,
}

enum InputType {
  header = 0,
  body = 1,
  distance = 2,
  offer = 3,
  epochindex = 4,
}

interface IPortalButton {
  title: string
  inputType: InputType
}

export function PortalButton(props: IPortalButton) {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)
  const [input, setInput] = useState('')
  const toast = useToast()
  const { peerState, peerDispatch } = useContext(PeerContext as React.Context<PeerContextType>)
  const peerActions = new PeerActions(
    {
      peerState,
      peerDispatch,
    },
    state.provider!.historyNetwork,
  )
  const [offer, setOffer] = useState<string[]>([])
  const [blockHash, setBlockhash] = useState<string>(
    '0x2d33dc73755afbbbeb6ec4885f2923398901bf1ad94beb325a4c4ecad5bf0f1c',
  )
  useEffect(() => {
    setInput(blockHash)
  }, [blockHash])

  const addToOffer = async (type: HistoryNetworkContentType) => {
    const contentKey = getContentKey(type, fromHexString(blockHash))
    const contentId = getContentId(type, blockHash)
    if (await state.provider?.historyNetwork.get(NetworkId.HistoryNetwork, contentKey)) {
      setOffer([...offer, contentId])
    }
  }

  useEffect(() => {
    peerDispatch({ type: PeerStateChange.SETOFFER, payload: [] })
  }, [])
  useEffect(() => {
    peerDispatch({ type: PeerStateChange.SETOFFER, payload: offer })
  }, [offer])
  const portal_doThing = {
    0: async () => {
      peerDispatch({ type: PeerStateChange.SETBLOCKHASH, payload: blockHash })
      const block = await peerActions.sendFindContent('header', state.selectedPeer)
      if (block) {
        dispatch!({ type: StateChange.SETBLOCK, payload: block })
      }
    },
    1: async () => {
      peerDispatch({ type: PeerStateChange.SETBLOCKHASH, payload: blockHash })
      const block = await peerActions.sendFindContent('body', state.selectedPeer)
      if (block) {
        dispatch!({ type: StateChange.SETBLOCK, payload: block })
      }
    },
    2: async () => {
      const nodes = await peerActions.handleFindNodes(ENR.decodeTxt(state!.selectedPeer))
      if (nodes) {
        toast({
          title: `${nodes.total} ENR's found`,
        })
      } else {
        toast({
          title: 'FindNodes failed',
        })
      }
    },
    3: async () => {
      const res = await peerActions.handleOffer(state.selectedPeer)
      if (res) {
        toast({
          title: `${res}`,
        })
      } else {
        toast({
          title: 'Offer failed',
        })
      }
    },
    4: async () => {
      peerDispatch({ type: PeerStateChange.SETEPOCH, payload: parseInt(input) })
      const epoch = await peerActions.sendFindContent('epoch', state.selectedPeer)
      if (epoch) {
        toast({
          title: 'Epoch Accumulator Found',
        })
      } else {
        toast({
          title: 'Epoch Accumulator Not Found',
        })
      }
    },
  }
  const valid: Record<number, boolean> = {
    0: input.startsWith('0x') && input.length === 66,
    1: input.startsWith('0x') && input.length === 66,
    2: parseInt(input) >= 0 && parseInt(input) < 257,
    3: parseInt(input) > 0,
    4: parseInt(input) >= 0 && parseInt(input) < 1898,
  }

  const placeholder: Record<InputType, string> = {
    0: `block_hash: 0xb495a1d7e6663152ae92708da4843337b958146015a2802f4193a410044698c9`,
    1: `block_hash: 0xb495a1d7e6663152ae92708da4843337b958146015a2802f4193a410044698c9`,
    2: `log2_distance (0 - 256)`,
    3: `0`,
    4: `epoch_accumulator_index (0 - 1897)`,
  }
  const inputError: Record<InputType, string> = {
    0: `block_hash must be 32bytes and begin with 0x...`,
    1: `block_hash must be 32bytes and begin with 0x...`,
    2: `log2_distance must be 8 byte unsigned integer`,
    3: `offer size must be between 1 and 26`,
    4: `epoch_accumulator_index range is 0 - 1897`,
  }
  const type: Record<InputType, string> = {
    0: `string`,
    1: `string`,
    2: `number`,
    3: `number`,
    4: `number`,
  }

  async function handleClick() {
    if (!valid[props.inputType]) {
      toast({
        title: 'Invalid input',
        status: 'error',
        description: inputError[props.inputType],
        duration: 3000,
        position: 'bottom',
      })
      setInput('')
      return
    }
    await portal_doThing[props.inputType]()
  }

  return (
    <VStack>
      <HStack width={'100%'} marginY={1}>
        {props.inputType === 3 ? (
          <Box width={'50%'}>
            <Text>H 0 B 0</Text>
          </Box>
        ) : (
          <Box width={'75%'}>
            <FormControl isInvalid={!valid[props.inputType]}>
              <Input
                width={'100%'}
                size={'sm'}
                bg="whiteAlpha.800"
                value={blockHash}
                placeholder={placeholder[props.inputType]}
                type={type[props.inputType]}
                onChange={(e) => setBlockhash(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && handleClick()}
              />
            </FormControl>
          </Box>
        )}
        {props.inputType === 3 ? (
          <Button
            aria-label="submit"
            size="sm"
            width={'50%'}
            onClick={handleClick}
            rightIcon={<SearchIcon />}
          >
            send_offer
          </Button>
        ) : (
          <IconButton
            aria-label="submit"
            size="sm"
            disabled={state.peers.length < 1}
            width={'25%'}
            onClick={handleClick}
            icon={<SearchIcon />}
          />
        )}
      </HStack>
      {props.inputType === 3 && (
        <VStack>
          <Input
            size="xs"
            value={blockHash}
            placeholder="block_hash or epoch_hash: 0x146015a2802f4193a410044698c9..."
            onChange={(evt) => setBlockhash(evt.target.value)}
          />
          <HStack width={'100%'}>
            <Button
              size="xs"
              width={'50%'}
              title="Add content to offer"
              onClick={() => {
                addToOffer(HistoryNetworkContentType.BlockHeader)
              }}
            >
              add_header_to_offer
            </Button>
            <Button
              size="xs"
              width={'50%'}
              title="Add content to offer"
              onClick={() => {
                addToOffer(HistoryNetworkContentType.BlockBody)
              }}
            >
              add_block_body_to_offer
            </Button>
            <Button
              size="xs"
              width={'50%'}
              title="Add content to offer"
              onClick={() => {
                addToOffer(HistoryNetworkContentType.EpochAccumulator)
              }}
            >
              add_epoch_to_offer
            </Button>
          </HStack>
        </VStack>
      )}
    </VStack>
  )
}

export default function PortalButtons() {
  const { state } = useContext(AppContext as React.Context<AppContextType>)
  const [button, setButton] = useState<GetBy | InputType>(0)

  return (
    <HStack width="100%">
      <Menu>
        <MenuButton
          disabled={state.peers.length < 1}
          width={['50%', '50%', '40%']}
          as={Button}
          size="xs"
          rightIcon={<ChevronDownIcon />}
        >
          {GetBy[button]}
        </MenuButton>
        <MenuList>
          <MenuItem onClick={() => setButton(0)}>find_content_header</MenuItem>
          <MenuItem onClick={() => setButton(1)}>find_content_body</MenuItem>
          <MenuItem onClick={() => setButton(2)}>find_nodes</MenuItem>
          <MenuItem onClick={() => setButton(3)}>offer_content</MenuItem>
          <MenuItem onClick={() => setButton(4)}>find_content_epoch</MenuItem>
        </MenuList>
      </Menu>
      <PortalButton inputType={button as InputType} title={GetBy[button as GetBy]} />
    </HStack>
  )
}
