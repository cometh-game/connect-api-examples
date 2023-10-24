import axios from 'axios'
import { BigNumber, ethers } from 'ethers'

const apiUrl = 'https://api.connect.cometh.io'
const apikey = 'YOUR_API_KEY'

const counterAddress = '0x3633a1be570fbd902d10ac6add65bb11fc914624'
const EIP712_SAFE_TX_TYPES = {
  SafeTx: [
    { type: 'address', name: 'to' },
    { type: 'uint256', name: 'value' },
    { type: 'bytes', name: 'data' },
    { type: 'uint8', name: 'operation' },
    { type: 'uint256', name: 'safeTxGas' },
    { type: 'uint256', name: 'baseGas' },
    { type: 'uint256', name: 'gasPrice' },
    { type: 'address', name: 'gasToken' },
    { type: 'address', name: 'refundReceiver' },
    { type: 'uint256', name: 'nonce' }
  ]
}

const main = async (): Promise<void> => {
  const params = await getProjectParams(apikey)

  await createWallet(apikey, params.chainId)
}

const getProjectParams = async (apikey: string): Promise<any> => {
  const params = (
    await sendGetRequest(`${apiUrl}/project/params`, {
      headers: { apikey }
    })
  ).projectParams

  return params
}

const createWallet = async (apikey: string, chainId: string): Promise<void> => {
  //for this example, we are creating a new EOA
  const signer = ethers.Wallet.createRandom()
  const ownerAddress = signer.address
  console.log(`Owner address (EOA): ${ownerAddress}`)

  const walletAddress = (
    await sendPostRequest(
      `${apiUrl}/wallets/init`,
      { ownerAddress },
      {
        headers: { apikey }
      }
    )
  ).walletAddress

  console.log(`Wallet we are about to create: ${walletAddress}`)

  //here, set the data for the action you want to do
  const data = ethers.utils.id('count()').slice(0, 10)

  const safeTxData = {
    to: counterAddress,
    value: '0',
    data,
    operation: '0',
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: ethers.constants.AddressZero,
    refundReceiver: ethers.constants.AddressZero,
    nonce: '0'
  }

  const signatures = await signTransaction(
    safeTxData,
    signer,
    walletAddress,
    chainId
  )

  const relayId = (
    await sendPostRequest(
      `${apiUrl}/wallets/${walletAddress}/relay`,
      { ...safeTxData, signatures },
      {
        headers: { apikey }
      }
    )
  ).safeTxHash

  console.log(`Deployment transaction sent to relayer with relayId ${relayId}`)
}

const sendGetRequest = async (url: string, config?: any): Promise<any> => {
  try {
    const response = await axios.get(url, config)
    return response.data
  } catch (error) {
    console.error('Error:', error)
  }
}

const sendPostRequest = async (
  url: string,
  postData: any,
  config?: any
): Promise<any> => {
  try {
    const response = await axios.post(url, postData, config)
    return response.data
  } catch (error) {
    console.error('Error:', error)
  }
}

const signTransaction = async (
  safeTxData: any,
  signer: ethers.Wallet,
  walletAddress: string,
  chainId: string
): Promise<string> => {
  return await signer._signTypedData(
    {
      chainId,
      verifyingContract: walletAddress
    },
    EIP712_SAFE_TX_TYPES,
    safeTxData
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
