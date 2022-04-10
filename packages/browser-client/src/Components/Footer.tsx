import { Text, HStack, IconButton, Link } from '@chakra-ui/react'
import React from 'react'
import { FaDiscord, FaGithub, FaGithubSquare, FaTwitter } from 'react-icons/fa'

export default function Footer() {
  return (
    <HStack width={'100%'} bg={'gray.100'} justifyContent={'space-evenly'}>
      <Link href="https://twitter.com/EthereumJs">
        <IconButton aria-label="EthereumJs Twitter" icon={<FaTwitter />} />
      </Link>
      <Link href="https://twitter.com/EthereumJs">
        <IconButton aria-label="EthereumJs Discord" icon={<FaDiscord />} />
      </Link>
      <Text>Made by EthereumJS</Text>
      <Link href="https://github.com/EthereumJS/Ultralight">
        <IconButton aria-label="Ultralight GitHub" icon={<FaGithubSquare />} />
      </Link>
      <Link href="https://github.com/EthereumJS">
        <IconButton aria-label="EthereumJs GitHub" icon={<FaGithub />} />
      </Link>
    </HStack>
  )
}
