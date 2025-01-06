import { UltralightProvider } from '../../portalnetwork/src/client/provider'
import { NetworkId } from '../../portalnetwork/src/networks/types'

const testBlockHash = '0x95b0950557cbc3e6647766adb719f80f7c7d192f4429b6026cdbd2cbe6a64294'
const testContract = '0x6b175474e89094c44da98b954eedeac495271d0f'
const testStorage = '0x0000000000000000000000000000000000000000000000000000000000000000'
const historicalBlock = 1048576

async function findHistoricalAccount(
  provider: UltralightProvider,
  blockNumber: number,
): Promise<string | null> {
  try {
    const block: any = await provider.request({
      method: 'eth_getBlockByNumber',
      params: [blockNumber, true],
    })

    if (
      block &&
      block.result &&
      block.result.transactions &&
      block.result.transactions.length > 0
    ) {
      const contractCreation = block.result.transactions.find((tx: any) => !tx.to)
      if (contractCreation) {
        console.log('Found contract creation transaction')
        return contractCreation.from
      }

      console.log('Using first transaction sender')
      return block.result.transactions[0].from
    }
    return null
  } catch (error) {
    console.error('Error finding historical account:', error)
    return null
  }
}

async function main() {
  const provider = await UltralightProvider.create({
    bootnodes: [
      'enr:-Jy4QIs2pCyiKna9YWnAF0zgf7bT0GzlAGoF8MEKFJOExmtofBIqzm71zDvmzRiiLkxaEJcs_Amr7XIhLI74k1rtlXICY5Z0IDAuMS4xLWFscGhhLjEtMTEwZjUwgmlkgnY0gmlwhKEjVaWJc2VjcDI1NmsxoQLSC_nhF1iRwsCw0n3J4jRjqoaRxtKgsEe5a-Dz7y0JloN1ZHCCIyg',
      'enr:-Jy4QKSLYMpku9F0Ebk84zhIhwTkmn80UnYvE4Z4sOcLukASIcofrGdXVLAUPVHh8oPCfnEOZm1W1gcAxB9kV2FJywkCY5Z0IDAuMS4xLWFscGhhLjEtMTEwZjUwgmlkgnY0gmlwhJO2oc6Jc2VjcDI1NmsxoQLMSGVlxXL62N3sPtaV-n_TbZFCEM5AR7RDyIwOadbQK4N1ZHCCIyg',
      'enr:-Jy4QH4_H4cW--ejWDl_W7ngXw2m31MM2GT8_1ZgECnfWxMzZTiZKvHDgkmwUS_l2aqHHU54Q7hcFSPz6VGzkUjOqkcCY5Z0IDAuMS4xLWFscGhhLjEtMTEwZjUwgmlkgnY0gmlwhJ31OTWJc2VjcDI1NmsxoQPC0eRkjRajDiETr_DRa5N5VJRm-ttCWDoO1QAMMCg5pIN1ZHCCIyg',
      'enr:-Ia4QLBxlH0Y8hGPQ1IRF5EStZbZvCPHQ2OjaJkuFMz0NRoZIuO2dLP0L-W_8ZmgnVx5SwvxYCXmX7zrHYv0FeHFFR0TY2aCaWSCdjSCaXCEwiErIIlzZWNwMjU2azGhAnnTykipGqyOy-ZRB9ga9pQVPF-wQs-yj_rYUoOqXEjbg3VkcIIjjA',
      'enr:-Ia4QM4amOkJf5z84Lv5Fl0RgWeSSDUekwnOPRn6XA1eMWgrHwWmn_gJGtOeuVfuX7ywGuPMRwb0odqQ9N_w_2Qc53gTY2aCaWSCdjSCaXCEwiErIYlzZWNwMjU2azGhAzaQEdPmz9SHiCw2I5yVAO8sriQ-mhC5yB7ea1u4u5QZg3VkcIIjjA',
      'enr:-Ia4QKVuHjNafkYuvhU7yCvSarNIVXquzJ8QOp5YbWJRIJw_EDVOIMNJ_fInfYoAvlRCHEx9LUQpYpqJa04pUDU21uoTY2aCaWSCdjSCaXCEwiErQIlzZWNwMjU2azGhA47eAW5oIDJAqxxqI0sL0d8ttXMV0h6sRIWU4ZwS4pYfg3VkcIIjjA',
      'enr:-Ia4QIU9U3zrP2DM7sfpgLJbbYpg12sWeXNeYcpKN49-6fhRCng0IUoVRI2E51mN-2eKJ4tbTimxNLaAnbA7r7fxVjcTY2aCaWSCdjSCaXCEwiErQYlzZWNwMjU2azGhAxOroJ3HceYvdD2yK1q9w8c9tgrISJso8q_JXI6U0Xwng3VkcIIjjA',
      'enr:-IS4QFV_wTNknw7qiCGAbHf6LxB-xPQCktyrCEZX-b-7PikMOIKkBg-frHRBkfwhI3XaYo_T-HxBYmOOQGNwThkBBHYDgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQKHPt5CQ0D66ueTtSUqwGjfhscU_LiwS28QvJ0GgJFd-YN1ZHCCE4k',
      'enr:-IS4QDpUz2hQBNt0DECFm8Zy58Hi59PF_7sw780X3qA0vzJEB2IEd5RtVdPUYZUbeg4f0LMradgwpyIhYUeSxz2Tfa8DgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQJd4NAVKOXfbdxyjSOUJzmA4rjtg43EDeEJu1f8YRhb_4N1ZHCCE4o',
      'enr:-IS4QGG6moBhLW1oXz84NaKEHaRcim64qzFn1hAG80yQyVGNLoKqzJe887kEjthr7rJCNlt6vdVMKMNoUC9OCeNK-EMDgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQLJhXByb3LmxHQaqgLDtIGUmpANXaBbFw3ybZWzGqb9-IN1ZHCCE4k',
      'enr:-IS4QA5hpJikeDFf1DD1_Le6_ylgrLGpdwn3SRaneGu9hY2HUI7peHep0f28UUMzbC0PvlWjN8zSfnqMG07WVcCyBhADgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQJMpHmGj1xSP1O-Mffk_jYIHVcg6tY5_CjmWVg1gJEsPIN1ZHCCE4o',
    ],
    bindAddress: '0.0.0.0',
    supportedNetworks: [
      { networkId: NetworkId.HistoryNetwork, maxStorage: 1024 },
      { networkId: NetworkId.StateNetwork, maxStorage: 1024 },
    ],
  })
  console.log('Provider created:', provider.portal.discv5.enr.nodeId)
  await provider.portal.start()
  console.log('portal started')

  while (provider.portal.network()['0x500b']?.routingTable.values().length === 0) {
    console.log('Waiting for network to start...')
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  console.log('Testing eth_getBlockByHash...')
  const block: any = await provider.request({
    method: 'eth_getBlockByHash',
    params: [testBlockHash, false],
  })

  console.log('Block by hash retrieved:', block)

  console.log('Testing eth_getBlockByNumber...')
  const blockByNumber = await provider.request({
    method: 'eth_getBlockByNumber',
    params: [historicalBlock, false],
  })

  console.log('Block by number retrieved:', blockByNumber)

  console.log(`Looking for accounts in block ${historicalBlock}...`)

  // const testAddress = await findHistoricalAccount(provider, historicalBlock)
  const testAddress = '0x3DC00AaD844393c110b61aED5849b7c82104e748'
  console.log('test address ', testAddress)
  if (!testAddress) {
    console.error('Could not find a historical account to test with')
  }

  console.log(`Found historical address: ${testAddress}`)

  console.log('Testing eth_getTransactionCount...')
  const transactionCount = await provider.request({
    method: 'eth_getTransactionCount',
    params: [testAddress, historicalBlock],
  })

  console.log('Transaction count:', transactionCount)

  console.log('Testing eth_getCode...')
  const code = await provider.request({
    method: 'eth_getCode',
    params: [testContract, '100'],
  })
  console.log('Contract code retrieved:', code)

  console.log('Testing eth_getBalance...')
  const balance = await provider.request({
    method: 'eth_getBalance',
    params: [testAddress, historicalBlock],
  })
  console.log('Account balance:', balance)

  console.log('Testing eth_getStorageAt...')
  const storage = await provider.request({
    method: 'eth_getStorageAt',
    params: [testContract, testStorage, historicalBlock],
  })
  console.log('Storage value:', storage)

  console.log('Testing eth_call...')
  const callData = {
    to: testAddress,
    data: '0x06fdde03',
    from: testContract,
  }
  const callResult = await provider.request({
    method: 'eth_call',
    params: [callData, historicalBlock],
  })
  console.log('Contract call result:', callResult)

  try {
    await provider.request({
      method: 'eth_unsupportedMethod',
      params: [],
    })
  } catch (error) {
    console.log('Expected error for unsupported method:', error.message)
  }

  process.exit(0)
}

main().catch((err) => console.error(err))
