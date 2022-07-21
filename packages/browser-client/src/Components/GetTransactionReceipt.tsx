import { Button, FormControl, HStack, Input } from '@chakra-ui/react'
import { ProtocolId } from 'portalnetwork'
import { HistoryProtocol } from 'portalnetwork/dist/subprotocols/history/history'
import React, { Dispatch, SetStateAction, useContext, useState } from 'react'
import { BlockContext, PortalContext, ReceiptContext, TxContext } from '../App'
import { decodeReceipt, jsonRpcReceipt, JsonRpcReceipt } from '../receipts'
import { toHexString } from './DisplayTx'

interface IGetBlockByNumberProps {
  setIsLoading: Dispatch<SetStateAction<boolean>>
}

export default function getTransactionReceipt(props: IGetBlockByNumberProps) {
  const [txHash, setTxHash] = useState(
    '0x45db80e2ea872275e74d64791987302295ade08ac6805aae6f2e8474bfce2a4d'
  )
  // const { tx, setTx } = useContext(TxContext)
  const { receipt, setReceipt } = useContext(ReceiptContext)

  const { portal } = useContext(PortalContext)

  // Adapted from rpc method in cli.

  async function eth_getTransactionReceipt(txHash: string): Promise<void> {
    const history = portal.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
    try {
      const receipt = (await history.eth_getTransactionReceipt(txHash)) as Uint8Array
      const txReceipt = decodeReceipt(toHexString(receipt), txHash)
      setReceipt(txReceipt)
    } catch {
      history.logger('Receipt not found')
    }
  }

  async function handleClick() {
    props.setIsLoading(true)
    await eth_getTransactionReceipt(txHash)
    props.setIsLoading(false)
  }

  return (
    <HStack marginY={1}>
      <Button width={'100%'} onClick={handleClick}>
        Get Transaction Receipt
      </Button>
      <FormControl isInvalid={!txHash.startsWith('0x')}>
        <Input
          bg="whiteAlpha.800"
          placeholder={'209999'}
          type={'string'}
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
        />
      </FormControl>
    </HStack>
  )
}
