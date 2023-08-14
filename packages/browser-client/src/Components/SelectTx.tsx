import { VStack, Box, HStack, Input, Text } from '@chakra-ui/react'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import DisplayTx from './DisplayTx'
import { AppContext, AppContextType } from '../globalReducer'
import { ExtendedEthersBlockWithTransactions } from 'portalnetwork'

export default function SelectTx() {
  const { state } = useContext(AppContext as React.Context<AppContextType>)
  const transactions = useMemo(() => {
    const b = state.block as ExtendedEthersBlockWithTransactions
    return b.transactions
  }, [state.block])
  const [search, setSearch] = useState('0x')
  const [tx, setTx] = useState(transactions[0])

  useEffect(() => {
    const i = transactions.map((tx) => tx.hash).indexOf(search)
    if (i > -1) {
      setTx(transactions[i])
    }
  }, [search])

  return (
    <VStack width={'100%'}>
      <HStack width={'100%'}></HStack>
      <Box width={'100%'}>
        <Input
          type={'search'}
          list="block_transactions"
          name="tx"
          title="Search by Tx hash"
          id="tx-list"
          placeholder={transactions[0].hash}
          onInput={(e) => {
            setSearch((e.target as any).value)
          }}
        />
        <datalist id="block_transactions">
          {transactions.map((t, idx) => {
            return (
              <Text key={idx} wordBreak={'break-all'}>
                <option
                  onClick={() => {
                    setSearch(t.hash)
                  }}
                  value={t.hash}
                >
                  {t.hash}
                </option>
              </Text>
            )
          })}
        </datalist>
      </Box>
      {<DisplayTx tx={tx} />}
    </VStack>
  )
}
