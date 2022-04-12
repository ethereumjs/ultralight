import {
  Heading,
  Link,
  Table,
  TableCaption,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react'
import React from 'react'
import { FaGithub } from 'react-icons/fa'

export default function Implementations() {
  const imps = [
    ['Ultralight', 'Typescript', 'https://github.com/ethereumjs/ultralight'],
    ['Fluffy', 'Nim', 'https://github.com/status-im/nimbus-eth/fluffy'],
    ['Trin', 'Rust', 'https://github.com/'],
  ]
  return (
    <VStack>
      <Text fontSize="x-small">
        There are currently 3 active Portal Network Implementation projects
      </Text>
      <Table fontSize={'x-small'} size={'sm'}>
        <Tbody>
          <Tr>
            <Th padding={0} fontSize={'x-small'}>
              Name
            </Th>
            <Th padding={0} fontSize={'x-small'}>
              Language
            </Th>
            <Th padding={0} fontSize={'x-small'}>
              Link
            </Th>
          </Tr>
          {imps.map((imp) => {
            return (
              <Tr key={imp[0]} fontSize={'x-small'}>
                <Td padding={0} fontSize={'x-small'}>
                  {imp[0]}
                </Td>
                <Td padding={0} fontSize={'x-small'}>
                  {imp[1]}
                </Td>
                <Td padding={0} fontSize={'x-small'}>
                  <Link href={imp[2]}>
                    <FaGithub />
                  </Link>
                </Td>
              </Tr>
            )
          })}
        </Tbody>
      </Table>
    </VStack>
  )
}
