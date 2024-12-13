import { ethers } from 'ethers';
import CONTRACT_ABI from "./contract-abi.json";

const CONTRACT_ADDRESS = "0x419D6566C665De2f94dA9748Ae6CA2ceA79f0991";

export const getContract = async () => {
    if (typeof window.ethereum === 'undefined') {
        throw new Error('Please install MetaMask');
    }

    try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Direct provider creation
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        // Explicitly get the connected account
        const address = await signer.getAddress();
        console.log('Connected Account:', address);

        const contract = new ethers.Contract(
            CONTRACT_ADDRESS, 
            CONTRACT_ABI, 
            signer
        );

        return contract;
    } catch (error) {
        console.error('Contract Connection Error:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        throw error;
    }
};