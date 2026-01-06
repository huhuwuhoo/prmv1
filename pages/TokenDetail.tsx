
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt, useBalance, useSwitchChain } from 'wagmi';
import { SUBTOKEN_ABI } from '../constants';
import { formatEther, parseEther } from 'viem';
import { baseSepolia } from 'wagmi/chains';

export default function TokenDetail() {
  const { address } = useParams();
  const tokenAddress = address as `0x${string}`;
  const { address: userAddress, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [amount, setAmount] = useState('');
  const [isBuyMode, setIsBuyMode] = useState(true);
  const [estimate, setEstimate] = useState<string>('0');

  const isWrongNetwork = chain?.id !== baseSepolia.id;

  // CRITICAL: 必须显式传 chainId: baseSepolia.id
  const { data: name } = useReadContract({ address: tokenAddress, abi: SUBTOKEN_ABI, functionName: 'name', chainId: baseSepolia.id });
  const { data: symbol } = useReadContract({ address: tokenAddress, abi: SUBTOKEN_ABI, functionName: 'symbol', chainId: baseSepolia.id });
  const { data: progress } = useReadContract({ address: tokenAddress, abi: SUBTOKEN_ABI, functionName: 'getProgress', chainId: baseSepolia.id });
  const { data: price } = useReadContract({ address: tokenAddress, abi: SUBTOKEN_ABI, functionName: 'getCurrentPrice', chainId: baseSepolia.id });
  const { data: balance } = useReadContract({ address: tokenAddress, abi: SUBTOKEN_ABI, functionName: 'balanceOf', args: [userAddress || '0x0000000000000000000000000000000000000000'], chainId: baseSepolia.id });
  const { data: ethBalance } = useBalance({ address: userAddress, chainId: baseSepolia.id });
  const { data: totalSupply } = useReadContract({ address: tokenAddress, abi: SUBTOKEN_ABI, functionName: 'totalSupply', chainId: baseSepolia.id });
  const { data: isGraduated } = useReadContract({ address: tokenAddress, abi: SUBTOKEN_ABI, functionName: 'isGraduated', chainId: baseSepolia.id });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: buyEstimate } = useReadContract({
    address: tokenAddress,
    abi: SUBTOKEN_ABI as any,
    functionName: 'getBuyAmount',
    args: [isBuyMode && amount && !isNaN(parseFloat(amount)) ? parseEther(amount) : 0n],
    chainId: baseSepolia.id
  });

  const { data: sellEstimate } = useReadContract({
    address: tokenAddress,
    abi: SUBTOKEN_ABI as any,
    functionName: 'getSellAmount',
    args: [!isBuyMode && amount && !isNaN(parseFloat(amount)) ? parseEther(amount) : 0n],
    chainId: baseSepolia.id
  });

  useEffect(() => {
    if (isBuyMode) {
      setEstimate(buyEstimate ? formatEther(buyEstimate as bigint) : '0');
    } else {
      setEstimate(sellEstimate ? formatEther(sellEstimate as bigint) : '0');
    }
  }, [buyEstimate, sellEstimate, isBuyMode]);

  const handleTrade = () => {
    if (isWrongNetwork) {
      switchChain({ chainId: baseSepolia.id });
      return;
    }
    if (!amount || isNaN(parseFloat(amount))) return;
    if (isBuyMode) {
      writeContract({
        address: tokenAddress,
        abi: SUBTOKEN_ABI as any,
        functionName: 'buy',
        value: parseEther(amount),
      });
    } else {
      writeContract({
        address: tokenAddress,
        abi: SUBTOKEN_ABI as any,
        functionName: 'sell',
        args: [parseEther(amount)],
      });
    }
  };

  const mcap = price && totalSupply 
    ? parseFloat(formatEther((price as bigint * totalSupply as bigint) / BigInt(1e18))) 
    : 0;

  if (!name || !symbol) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 font-mono">
      <div className="w-16 h-16 border-8 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-green-500 font-black text-xl animate-pulse tracking-tighter uppercase">Querying Base Sepolia Node...</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-black text-gray-500 hover:text-green-500 transition-all font-mono uppercase tracking-tighter group">
        <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Terminal
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="card-bg border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-3xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div className="min-w-0">
                <div className="flex items-center gap-4 mb-4">
                  <h1 className="text-5xl md:text-7xl font-black truncate leading-none tracking-tighter">{name.toString()}</h1>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-black text-2xl font-mono">[{symbol.toString()}]</span>
                  <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-xl text-[10px] font-mono text-gray-400 select-all">
                    {tokenAddress}
                  </span>
                </div>
              </div>
              <div className="bg-green-500/5 p-6 rounded-[2rem] border border-green-500/10 text-right min-w-[200px]">
                <p className="text-[10px] text-gray-500 uppercase font-black font-mono mb-2">Market Cap</p>
                <p className="text-4xl font-black text-green-400 leading-none">
                  {mcap.toFixed(4)} <span className="text-xs text-green-700">ETH</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              <div className="card-bg border border-white/10 p-6 rounded-2xl">
                <p className="text-[10px] text-gray-500 font-black font-mono uppercase mb-2">Price (Sepolia)</p>
                <p className="text-lg font-black text-gray-200 truncate">{price ? parseFloat(formatEther(price as bigint)).toFixed(10) : '0'} ETH</p>
              </div>
              <div className="card-bg border border-white/10 p-6 rounded-2xl">
                <p className="text-[10px] text-gray-500 font-black font-mono uppercase mb-2">Supply</p>
                <p className="text-lg font-black text-gray-200 truncate">{totalSupply ? parseFloat(formatEther(totalSupply as bigint)).toLocaleString() : '0'}</p>
              </div>
              <div className="card-bg border border-white/10 p-6 rounded-2xl">
                <p className="text-[10px] text-gray-500 font-black font-mono uppercase mb-2">Status</p>
                <p className={`text-lg font-black uppercase ${isGraduated ? 'text-yellow-500' : 'text-blue-400'}`}>
                  {isGraduated ? 'Graduated' : 'Bonding Curve'}
                </p>
              </div>
            </div>

            <div className="h-96 bg-black/60 rounded-[2.5rem] flex items-center justify-center border border-white/5 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 via-transparent to-transparent"></div>
               <div className="text-center space-y-4 z-10 px-6">
                 <div className="w-20 h-20 mx-auto border-4 border-green-500/20 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                 </div>
                 <div>
                   <p className="text-gray-400 font-black text-xl tracking-tighter uppercase">Live Bonding Curve Chart</p>
                   <p className="text-gray-600 font-mono text-xs uppercase mt-1">Network: Base Sepolia Testnet</p>
                 </div>
               </div>
            </div>
          </div>

          <div className="card-bg border border-white/10 rounded-[3rem] p-8 md:p-12">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black font-mono tracking-widest uppercase">Launch Progress</h2>
              <span className="text-green-500 font-black font-mono text-xl bg-green-500/10 px-4 py-1 rounded-2xl border border-green-500/20">
                {progress?.toString() || '0'}%
              </span>
            </div>
            
            <div className="relative w-full h-14 bg-black rounded-full overflow-hidden border border-white/10 p-1.5 mb-8">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${isGraduated ? 'bg-yellow-500' : 'pump-gradient shadow-[0_0_30px_rgba(34,197,94,0.4)]'}`} 
                style={{ width: `${progress?.toString() || 0}%` }}
              >
              </div>
              <div className="absolute inset-0 flex items-center justify-center font-black text-sm uppercase mix-blend-difference tracking-widest">
                {isGraduated ? 'DEX LISTING READY' : `REQUIRED UNTIL DEX: ${100 - (Number(progress) || 0)}%`}
              </div>
            </div>
            <p className="text-center text-xs text-gray-500 font-mono uppercase">
              当进度达到 100% 时，流动性将自动迁移到 Base Sepolia Uniswap。
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="card-bg border border-white/10 rounded-[3rem] p-8 sticky top-24 shadow-2xl">
            <div className="flex rounded-3xl bg-black p-2 mb-10 border border-white/5">
              <button 
                onClick={() => { setIsBuyMode(true); setAmount(''); }}
                className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase transition-all ${isBuyMode ? 'bg-green-500 text-black shadow-[0_10px_30px_-5px_rgba(34,197,94,0.5)]' : 'text-gray-500 hover:text-white'}`}
              >
                Buy
              </button>
              <button 
                onClick={() => { setIsBuyMode(false); setAmount(''); }}
                className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase transition-all ${!isBuyMode ? 'bg-red-500 text-white shadow-[0_10px_30px_-5px_rgba(239,68,68,0.5)]' : 'text-gray-500 hover:text-white'}`}
              >
                Sell
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <div className="flex justify-between text-[10px] mb-3 font-black font-mono uppercase tracking-widest px-2">
                  <label className="text-gray-500">{isBuyMode ? 'Amount (ETH)' : `Amount (${symbol})`}</label>
                  <span className="text-gray-400">
                    BAL: {isBuyMode ? `${ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : '0'} ETH` : `${balance ? parseFloat(formatEther(balance as bigint)).toLocaleString() : 0} ${symbol}`}
                  </span>
                </div>
                <div className="relative group">
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-black border-2 border-white/5 rounded-[2rem] px-8 py-6 text-3xl font-black focus:outline-none focus:border-green-500/40 transition-all placeholder:text-gray-800"
                  />
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-gray-600 font-mono text-xl">
                    {isBuyMode ? 'ETH' : symbol.toString()}
                  </span>
                </div>
              </div>

              <div className="bg-black/50 p-6 rounded-3xl border border-white/5 space-y-4 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 uppercase font-black">Estimate Out</span>
                  <span className="font-black text-green-400 text-base">
                    {parseFloat(estimate).toLocaleString()} {isBuyMode ? symbol.toString() : 'ETH'}
                  </span>
                </div>
                <div className="h-px bg-white/5 w-full"></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 uppercase font-black">Fee</span>
                  <span className="text-gray-400">0.5%</span>
                </div>
              </div>

              <button 
                disabled={(!amount && !isWrongNetwork) || isPending || isConfirming || (isGraduated && !isBuyMode)}
                onClick={handleTrade}
                className={`w-full py-6 rounded-[2rem] font-black text-xl uppercase shadow-3xl transform transition-all active:scale-[0.97] disabled:opacity-30 flex items-center justify-center gap-3 ${isWrongNetwork ? 'bg-yellow-500 text-black' : isBuyMode ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-red-500 text-white hover:bg-red-400'}`}
              >
                {isWrongNetwork ? (
                    <><span>SWITCH TO BASE SEPOLIA</span></>
                ) : isPending || isConfirming ? (
                    <><div className="w-5 h-5 border-4 border-current border-t-transparent rounded-full animate-spin"></div> PROCESSING...</>
                ) : (isGraduated && !isBuyMode ? 'LISTED ON DEX' : `${isBuyMode ? 'BUY NOW' : 'SELL NOW'}`)}
              </button>

              <div className="text-[9px] text-center text-gray-600 font-black uppercase tracking-tighter leading-relaxed">
                Notice: All transactions are on Base Sepolia. <br />
                Do not send real funds to this contract.
              </div>

              {isSuccess && (
                <div className="bg-green-500 text-black rounded-2xl p-4 text-center text-xs font-black uppercase tracking-widest animate-bounce">
                  Transaction Successful!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
