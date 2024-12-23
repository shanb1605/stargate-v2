import assert from 'assert'

import { TokenName } from '@stargatefinance/stg-definitions-v2'

import { OmniGraphHardhat, createContractFactory, createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OwnableNodeConfig } from '@layerzerolabs/ua-devtools'

import { createGetAssetAddresses, getAssetNetworkConfig } from '../../../../ts-src/utils/util'
import { onDegen, onPeaq } from '../utils'

const fiatContract = { contractName: 'TetherTokenV2' }

// For external USDT deployments
const usdtPeaqAsset = getAssetNetworkConfig(EndpointId.PEAQ_V2_MAINNET, TokenName.USDT)
assert(usdtPeaqAsset.address != null, `External USDT address not found for PEAQ`)

const usdtDegenAsset = getAssetNetworkConfig(EndpointId.DEGEN_V2_MAINNET, TokenName.USDT)
assert(usdtDegenAsset.address != null, `External USDT address not found for DEGEN`)

export default async (): Promise<OmniGraphHardhat<OwnableNodeConfig, unknown>> => {
    // First let's create the HardhatRuntimeEnvironment objects for all networks
    const getEnvironment = createGetHreByEid()
    const contractFactory = createContractFactory(getEnvironment)

    const peaqUSDTProxy = await contractFactory(
        onPeaq({ contractName: 'TransparentUpgradeableProxy', address: usdtPeaqAsset.address })
    )

    const degenUSDTProxy = await contractFactory(
        onDegen({ contractName: 'TransparentUpgradeableProxy', address: usdtDegenAsset.address })
    )

    const peaqUSDT = onPeaq({ ...fiatContract, address: peaqUSDTProxy.contract.address })
    const degenUSDT = onDegen({ ...fiatContract, address: degenUSDTProxy.contract.address })

    // Now we collect the address of the deployed assets(StargateOft.sol etc.)
    const usdtAssets = [TokenName.USDT] as const
    const getAssetAddresses = createGetAssetAddresses(getEnvironment)
    const peaqAssetAddresses = await getAssetAddresses(EndpointId.PEAQ_V2_MAINNET, usdtAssets)
    const degenAssetAddresses = await getAssetAddresses(EndpointId.DEGEN_V2_MAINNET, usdtAssets)

    return {
        contracts: [
            {
                contract: peaqUSDT,
                config: {
                    owner: peaqAssetAddresses.USDT,
                },
            },
            {
                contract: degenUSDT,
                config: {
                    owner: degenAssetAddresses.USDT,
                },
            },
        ],
        connections: [],
    }
}
