import { Button, ButtonGroup } from '@chakra-ui/react'
import React from 'react'
import { Dispatch, SetStateAction } from 'react'

interface BootnodeProps {
  setPeerEnr: Dispatch<SetStateAction<string>>
  handleClick: () => Promise<void>
}

export default function Bootnode(props: BootnodeProps) {
  const bootnodes: Record<string, string> = {
    Fluffy01:
      'enr:-IS4QGeTMHteRmm-MSYniUd48OZ1M7RMUsIjnSP_TRbo-goQZAdYuqY2PyNJfDJQBz33kv16k7WB3bZnBK-O1DagvJIBgmlkgnY0gmlwhEFsKgOJc2VjcDI1NmsxoQIQXNgOCBNyoXz_7XP4Vm7pIB1Lp35d67BbC4iSlrrcJoN1ZHCCI40',
    Fluffy02:
      'enr:-IS4QOA4voX3J7-R_x8pjlaxBTpT1S_CL7ZaNjetjZ-0nnr2VaP0wEZsT2KvjA5UWc8vi9I0XvNSd1bjU0GXUjlt7J0BgmlkgnY0gmlwhEFsKgOJc2VjcDI1NmsxoQI7aL5dFuHhwbxWD-C1yWH7UPlae5wuV_3WbPylCBwPboN1ZHCCI44',
    Fluffy03:
      'enr:-IS4QFzPZ7Cc7BGYSQBlWdkPyep8XASIVlviHbi-ZzcCdvkcE382unsRq8Tb_dYQFNZFWLqhJsJljdgJ7WtWP830Gq0BgmlkgnY0gmlwhEFsKq6Jc2VjcDI1NmsxoQPjz2Y1Hsa0edvzvn6-OADS3re-FOkSiJSmBB7DVrsAXIN1ZHCCI40',
    Fluffy04:
      'enr:-IS4QHA1PJCdmESyKkQsBmMUhSkRDgwKjwTtPZYMcbMiqCb8I1Xt-Xyh9Nj0yWeIN4S3sOpP9nxI6qCCR1Nf4LjY0IABgmlkgnY0gmlwhEFsKq6Jc2VjcDI1NmsxoQLMWRNAgXVdGc0Ij9RZCPsIyrrL67eYfE9PPwqwRvmZooN1ZHCCI44',
  }

  function handleClick(enr: string) {
    props.setPeerEnr(enr)
    props.handleClick()
  }

  return (
    <ButtonGroup justifyContent={'space-around'}>
      {Object.entries(bootnodes).map(([name, enr], idx) => {
        return (
          <Button
            key={name}
            size={'md'}
            onMouseDown={() => props.setPeerEnr(enr)}
            onMouseUp={() => props.handleClick()}
          >
            {name}
          </Button>
        )
      })}
    </ButtonGroup>
  )
}
