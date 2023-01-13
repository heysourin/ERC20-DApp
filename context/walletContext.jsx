import React, {
  Component,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import { contractABI, contractAddress } from '../helpers/constants'
import { ethers } from 'ethers'

export const walletContext = createContext()
export const useWalletContext = () => useContext(walletContext)
function WalletProvider({ children }) {
  const [currentAccount, setCurrentAccount] = useState(null)
  const [contractState, setContractState] = useState(null)

  const connectWallet = async () => {
    try {
      // If metamask extension is not installed, etherem will be undefined.
      const { ethereum } = window
      if (!ethereum) return

      const accounts = await ethereum.request({
        // This opens metamask and ask to connect to the website.
        method: 'eth_requestAccounts',
      })

      setCurrentAccount(accounts[0])
    } catch (error) {
      console.log(error)
    }
  }

  const checkConnection = async () => {
    try {
      const { ethereum } = window
      if (!ethereum) return
      const accounts = await ethereum.request({
        // this method check for any connection and returns array of accounts which are connected
        method: 'eth_accounts',
      })
      setCurrentAccount(accounts[0])
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${Number(80001).toString(16)}` }],
        })
      } catch (error) {
        console.log(error)

        if (error.code === 4902) {
          addNetwork()
        }
        if (error.code === -32002) {
          alert('Open Metamask')
        }
      }
      getContractState()
    } catch (error) {
      console.log(error)
    }
  }

  const addNetwork = async () => {
    try {
      await window.ethereum.request({
        // Learn more about this method here https://docs.metamask.io/guide/rpc-api.html#wallet-addethereumchain
        // To get the details of any chain, visit https://chainid.network/chains.json
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x5`,
            chainName: 'Goerli',
            nativeCurrency: {
              name: 'Goerli',
              symbol: 'Goerli',
              decimals: 18,
            },
            rpcUrls: [
              'https://goerli.infura.io/v3/${INFURA_API_KEY}',
              'wss://goerli.infura.io/v3/${INFURA_API_KEY}',
              'https://rpc.goerli.mudit.blog/',
            ],
            faucets: [
              'http://fauceth.komputing.org?chain=5&address=${ADDRESS}',
              'https://goerli-faucet.slock.it?address=${ADDRESS}',
              'https://faucet.goerli.mudit.blog',
            ],
            blockExplorerUrls: ['https://goerli.etherscan.io'],
          },
        ],
      })
    } catch (error) {
      console.log(error)
    }
  }

  const getContract = () => {
    const { ethereum } = window

    if (!ethereum) return

    const provider = new ethers.providers.Web3Provider(ethereum)
    const signer = provider.getSigner()

    const contractMethods = new ethers.Contract(
      contractAddress,
      contractABI,
      signer,
    )

    return contractMethods
  }
  const getContractState = async () => {
    try {
      // contractMethods will have all the functions of our smart contract as well as the inherited smart contract.
      const contractMethods = getContract()

      // We declared this function to get the values of our state variables. We were returning multiple values from this function, so we<ll recieve them in array.

      const state = await contractMethods.returnState()

      // Accessing them by index and storing in react state.
      // Remember 1 in JS = 1*10^18 in solidity? Values returned by contract are not supported in JS, so ether gives us util function to format / parse them.
      // so we are formatting the values using ethers.utils.formatEther().
      setContractState({
        myBalance: state[0]
          ? parseFloat(ethers.utils.formatEther(state[0]))
          : 0,
        maxSupply: parseFloat(ethers.utils.formatEther(state[1])),
        totalSupply: parseFloat(ethers.utils.formatEther(state[2])),
        tokenPrice: ethers.utils.formatEther(state[3]),
      })
    } catch (error) {
      console.log(error)
    }
  }
  const handleMint = async () => {
    // mintAmount is a react state hooked with an number input.
    if (mintAmount == 0) return

    // Getting all the methods of contract.
    const contractMethods = createEthereumContract()

    // Declaring value (number of ether) that has to be sent with function call (Transaction).
    // Calculating how munch ether user need to send based on tokenPrice to get mintAmount number of token.
    // Like I<ve mentioned earlier, 1 in JS = 1*10^18 in Solidity, so we are converting JS value to Solidity supported value using ethers.utils.parseEther().
    const options = {
      value: ethers.utils.parseEther(
        (mintAmount * contractState.tokenPrice).toString(),
      ),
    }

    // ethers.utils.parseEther() only accepts string, so we need to convert mintAmount to String.
    // Passing our option object as the LAST PARAMETER to mint() function of contract which determines how much ether to be sent.
    try {
      const txn = await contractMethods.mint(
        ethers.utils.parseEther(mintAmount.toString()),
        options,
      )

      // Once transaction is initiated, we can wait for the transaction be get mined.
      await txn.wait()

      // Once transaction is mined, Fetch updated states of contract.
      getContractStates()
    } catch (error) {
      console.log(error)
    }
  }
  const handleTransfer = async () => {
    // amount is react state hooked with number input to determine how much tkoen to transfer.
    if (amount == 0) return

    // Fetching functions of contract.
    const contractMethods = createEthereumContract()

    try {
      // Passing the wallet adrress of receiver and amount after parsing it.
      const txn = await contractMethods.transfer(
        to,
        ethers.utils.parseEther(amount.toString()),
      )

      // Waiting for transaction to be mined.
      await txn.wait()

      // Once mined, fetching updated contract states.
      getContractStates()
    } catch (error) {
      // Handle Common Errors.
      if (error.reason === 'invalid address') alert('Invalid Address')
      else if (
        error.reason ===
        'execution reverted: ERC20: transfer amount exceeds balance'
      )
        alert('Transfer amount exceeds balance')
      else alert(error.reason)
    }
  }

  useEffect(() => {
    if (!window.etherum) return
    checkConnection()
    // In metamask, you can either change the active account(user), or change the active network (goerli, mumbai, kovan, etc.)
    ethereum.on('chainChanged', handleChainChanged)
    ethereum.on('accountsChanged', handleDisconnect)

    // Cleanup of listener on unmount
    return () => {
      ethereum.removeListener('chainChanged', handleChainChanged)
      ethereum.removeListener('accountsChanged', handleDisconnect)
    }
  }, [])

  const handleDisconnect = (accounts) => {
    if (accounts.length == 0) {
      setCurrentAccount('')
    } else {
      setCurrentAccount(accounts[0])
    }
  }

  const handleChainChanged = (chainId) => {
    // If the chain is changed to goerli network, don't do anything.
    if (chainId == '0x13881') return // chain id is received in hexadecimal

    // chain is changed to any other network, reload the page.
    // On reload, checkConnection will run due to useEffect.
    // Inside of that function, we are asking user to switch to goerli network.
    window.location.reload()
  }

  const contextValue = {
    connectWallet,
    currentAccount,
    contractState,
    getContract,
  }

  return (
    <walletContext.Provider value={contextValue}>
      {children}
    </walletContext.Provider>
  )
}

export default WalletProvider
