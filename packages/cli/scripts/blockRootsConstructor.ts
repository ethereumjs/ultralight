import { writeFileSync } from 'fs'

const main = async () => {
  const blockRoots: string[] = []
  const endSlot = 9699328
  let endBlock = 20491827
  const startBlock = 20491828 - 8192

  for (; endBlock > startBlock; endBlock--) {
    const res = await (
      await fetch('https://mainnet.infura.io/v3/9eb527726b034638b37f37f66b0f80d7', {
        method: 'POST',
        headers: [['Content-Type', 'application/json']],
        body: `{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x${BigInt(endBlock).toString(16)}",false],"id":1}`,
      })
    ).json()
    if (res.result === undefined) {
      console.log(res)
      blockRoots.unshift(blockRoots[0])
    } else blockRoots.unshift(res.result.parentBeaconBlockRoot)
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  writeFileSync('epoch1183.json', JSON.stringify(blockRoots))
}

void main()
