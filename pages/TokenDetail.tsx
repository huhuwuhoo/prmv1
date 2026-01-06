
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { SUBTOKEN_ABI } from '../constants';
import { formatEther, parseEther } from 'viem';

export default function TokenDetail() {
  const { address } = useParams();
  const tokenAddress = address as `0x${string}`;
  const { address: userAddress } = useAccount();
  const [amount, setAmount] = useState('');
  const [isBuyMode, setIsBuyMode] = useState(true);
  const [estimate, setEstimate] = useState<string>('0');

  const { data: name } = useReadContract({ address: tokenAddress, abi: SUBTOKEN_ABI, functionName: 'name' });
  const { data: symbol } = useReadContract({ address: tokenAddress, abi: SUBTOKEN_ABI, functionName: 'symbol' });
  const { data: progress } = useReadContract({ address: tokenAddress, abi: SUBTOKEN_ABI, functionName: 'getProgress' });
  const { data: price } = useReadContract({ address: tokenAddress, abi: SUBTOKEN_ABI, functionName: 'getCurrentPrice' });
  const { data: balance } = useReadContract({ address: tokenAddress, abi: SUBTOKEN_ABI, functionName: 'balanceOf', args: [userAddress || '0x0000000000000000000000000000000000000000'] });
  const { data: ethBalance } = useBalance({ address: userAddress });
  const { data: totalSupply } = useReadContract({ address: tokenAddress, abi: SUBTOKEN_ABI, functionName: 'totalSupply' });
  const { data: isGraduated } = useReadContract({ address: tokenAddress, abi: SUBTOKEN_ABI, functionName: 'isGraduated' });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: buyEstimate } = useReadContract({
    address: tokenAddress,
    abi: SUBTOKEN_ABI as any,
    functionName: 'getBuyAmount',
    args: [isBuyMode && amount && !isNaN(parseFloat(amount)) ? parseEther(amount) : 0n],
  });

  const { data: sellEstimate } = useReadContract({
    address: tokenAddress,
    abi: SUBTOKEN_ABI as any,
    functionName: 'getSellAmount',
    args: [!isBuyMode && amount && !isNaN(parseFloat(amount)) ? parseEther(amount) : 0n],
  });

  useEffect(() => {
    if (isBuyMode) {
      setEstimate(buyEstimate ? formatEther(buyEstimate as bigint) : '0');
    } else {
      setEstimate(sellEstimate ? formatEther(sellEstimate as bigint) : '0');
    }
  }, [buyEstimate, sellEstimate, isBuyMode]);

  const handleTrade = () => {
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
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 font-mono">
      <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-green-500 animate-pulse">SYNCHRONIZING TOKEN DATA...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-green-500 transition-colors font-mono">
        ← BACK TO TERMINAL
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-bg pump-border rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl md:text-5xl font-black truncate">{name.toString()}</h1>
                  <span className="text-gray-500 font-mono text-xl">[{symbol.toString()}]</span>
                </div>
                <p className="text-gray-500 font-mono text-xs break-all bg-white/5 p-2 rounded border border-white/5 inline-block">
                  {tokenAddress}
                </p>
              </div>
              <div className="bg-green-500/5 p-4 rounded-2xl border border-green-500/10 text-right">
                <p className="text-[10px] text-gray-500 uppercase font-mono mb-1">当前市值</p>
                <p className="text-3xl font-black text-green-400 leading-none">
                  {mcap.toFixed(4)} <span className="text-xs">ETH</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="card-bg pump-border p-4 rounded-xl">
                <p className="text-[10px] text-gray-500 font-mono">价格</p>
                <p className="font-bold text-gray-200 truncate">{price ? parseFloat(formatEther(price as bigint)).toFixed(10) : '0'} ETH</p>
              </div>
              <div className="card-bg pump-border p-4 rounded-xl">
                <p className="text-[10px] text-gray-500 font-mono">供应量</p>
                <p className="font-bold text-gray-200 truncate">{totalSupply ? parseFloat(formatEther(totalSupply as bigint)).toLocaleString() : '0'}</p>
              </div>
              <div className="card-bg pump-border p-4 rounded-xl">
                <p className="text-[10px] text-gray-500 font-mono">状态</p>
                <p className={`font-bold uppercase ${isGraduated ? 'text-yellow-500' : 'text-blue-400'}`}>
                  {isGraduated ? 'UNISWAP LIVE' : 'BONDING CURVE'}
                </p>
              </div>
            </div>

            <div className="h-80 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 to-transparent"></div>
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)] from-green-500/5"></div>
               <div className="text-center space-y-2 z-10">
                 <div className="w-16 h-16 mx-auto border-2 border-green-500/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                 </div>
                 <p className="text-gray-500 font-mono text-sm tracking-widest uppercase mt-4">实时价格图表</p>
               </div>
            </div>
          </div>

          <div className="card-bg pump-border rounded-2xl p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-mono tracking-tight uppercase">联合曲线进度</h2>
              <span className="text-green-500 font-mono text-sm font-bold bg-green-500/10 px-2 py-0.5 rounded">{progress?.toString()}%</span>
            </div>
            
            <div className="relative w-full h-10 bg-black rounded-full overflow-hidden border border-white/10 p-1 mb-6">
              <div 
                className={`h-full rounded-full transition-all duration-1000 flex items-center justify-end px-4 ${isGraduated ? 'bg-yellow-500' : 'pump-gradient shadow-[0_0_20px_rgba(34,197,94,0.3)]'}`} 
                style={{ width: `${progress?.toString() || 0}%` }}
              >
              </div>
              <div className="absolute inset-0 flex items-center justify-center font-black text-sm uppercase mix-blend-difference">
                {isGraduated ? 'TOKEN GRADUATED' : `DISTANCE TO DEX: ${100 - (Number(progress) || 0)}%`}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-500 font-mono leading-relaxed">
              <p>
                当该代币达到 <span className="text-green-400">100%</span> 进度时，所有流动性将被迁移至 Uniswap V2 交易对。
              </p>
              <p>
                系统将自动铸造 LP 代币并发送至 <span className="text-red-500">0x000...dead</span> 永久销毁，确保流动性永不撤池。
              </p>
            </div>
          </div>
        </div>

        {/* Trade Interface */}
        <div className="space-y-6">
          <div className="card-bg pump-border rounded-2xl p-6 sticky top-24">
            <div className="flex rounded-2xl bg-black p-1.5 mb-8 border border-white/5">
              <button 
                onClick={() => { setIsBuyMode(true); setAmount(''); }}
                className={`flex-1 py-3 rounded-xl font-black text-sm uppercase transition-all ${isBuyMode ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'text-gray-500 hover:text-white'}`}
              >
                买入
              </button>
              <button 
                onClick={() => { setIsBuyMode(false); setAmount(''); }}
                className={`flex-1 py-3 rounded-xl font-black text-sm uppercase transition-all ${!isBuyMode ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'text-gray-500 hover:text-white'}`}
              >
                卖出
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[10px] mb-2 font-mono uppercase tracking-wider">
                  <label className="text-gray-400">{isBuyMode ? '支出金额' : '卖出数量'}</label>
                  <span className="text-gray-500">
                    余额: {isBuyMode ? `${ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : '0'} ETH` : `${balance ? parseFloat(formatEther(balance as bigint)).toLocaleString() : 0} ${symbol}`}
                  </span>
                </div>
                <div className="relative group">
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black border border-white/10 rounded-2xl px-5 py-5 text-2xl font-black focus:outline-none focus:border-green-500/50 transition-all focus:ring-1 focus:ring-green-500/20"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-gray-500 font-mono">
                    {isBuyMode ? 'ETH' : symbol.toString()}
                  </span>
                </div>
              </div>

              <div className="bg-black p-4 rounded-2xl border border-white/5 space-y-3 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500 uppercase">预计获得</span>
                  <span className="font-black text-green-400">
                    {parseFloat(estimate).toLocaleString()} {isBuyMode ? symbol.toString() : 'ETH'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 uppercase">交易滑点</span>
                  <span className="text-gray-400">0.5%</span>
                </div>
              </div>

              <button 
                disabled={!amount || isPending || isConfirming || (isGraduated && !isBuyMode)}
                onClick={handleTrade}
                className={`w-full py-5 rounded-2xl font-black text-lg uppercase shadow-2xl transform transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed ${isBuyMode ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-red-500 text-white hover:bg-red-400'}`}
              >
                {isPending || isConfirming ? '交易进行中...' : (isGraduated && !isBuyMode ? '毕业后请前往 UNISWAP 卖出' : `${isBuyMode ? '立即买入' : '确认卖出'}`)}
              </button>

              {isSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center text-green-500 text-xs font-mono uppercase tracking-widest animate-pulse">
                  TRANSACTION SUCCESSFUL
                </div>
              )}
            </div>
          </div>

          <div className="card-bg pump-border rounded-2xl p-6 text-xs font-mono text-gray-500 space-y-2">
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">合约快照</p>
            <div className="flex justify-between">
              <span>DEPLOYED</span>
              <span>TOKEN_V1</span>
            </div>
            <div className="flex justify-between">
              <span>BONDING_TYPE</span>
              <span>LINEAR</span>
            </div>
            <div className="flex justify-between">
              <span>LP_STATUS</span>
              <span>AUTO_BURN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
