import { assert, describe, it } from 'vitest'
import packageJson from '../../package.json'

import {
  NetworkId,
  SupportedVersions,
  TransportLayer,
  createPortalNetwork,
} from '../../src/index.js'
describe('Client unit tests', () => {
  it('node initialization/startup', async () => {
    const node = await createPortalNetwork({
      bindAddress: '192.168.0.1',
      transport: TransportLayer.WEB,
      supportedNetworks: [{ networkId: NetworkId.HistoryNetwork }],
      supportedVersions: [0, 1],
    })
    assert.equal(
      packageJson.version,
      node.clientInfo.clientVersionAndShortCommit.slice(0, packageJson.version.length),
      'package.json version is set',
    )
    assert.equal(
      node.clientInfo.programmingLanguageAndVersion,
      `typescript_${packageJson.devDependencies.typescript}`,
      'package.json devDependencies typescript version is set',
    )
    assert.equal(
      node.discv5.enr.getLocationMultiaddr('udp')!.toOptions().host,
      '192.168.0.1',
      'created portal network node with correct ip address',
    )
    const pv = node.discv5.enr.kvs.get('pv')
    assert.isDefined(pv)
    const versions = SupportedVersions.deserialize(pv)
    assert.deepEqual(versions, [0, 1])
  })
})
