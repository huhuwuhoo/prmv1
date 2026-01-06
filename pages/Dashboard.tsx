
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useReadContract, usePublicClient, useWriteContract, useAccount, useWaitForTransactionReceipt, useWatchContractEvent } from 'wagmi';
import { CORE_ADDRESS, CORE_ABI, SUBTOKEN_ABI } from '../constants';
import { formatEther, parseEther, parseAbiItem } from 'viem';
import { baseSepolia } from 'wagmi/chains';

interface TokenCardProps {
  address: `0x${string}`;
}

const TokenCard: React.FC<TokenCardProps> = ({ address }) => {
  const { data: name } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'name', chainId: baseSepolia.id });
  const { data: symbol } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'symbol', chainId: baseSepolia.id });
  const { data: progress } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'getProgress', chainId: baseSepolia.id });
  const { data: price } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'getCurrentPrice', chainId: baseSepolia.id });
  const { data: isGraduated } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'isGraduated', chainId: baseSepolia.id });
  const { data: totalSupply } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'totalSupply', chainId: baseSepolia.id });

  if (!name || !symbol) return (
    <div className="card-bg border border-white/5 rounded-3xl p-6 h-60 animate-pulse flex flex-col justify-between">
      <div className="w-16 h-16 bg-white/5 rounded-2xl"></div>
      <div className="space-y-3">
        <div className="h-5 bg-white/5 rounded w-3/4"></div>
        <div className="h-3 bg-white/5 rounded w-1/2"></div>
      </div>
      <div className="h-2 bg-white/5 rounded w-full"></div>
    </div>
  );

  const mcap = price && totalSupply 
    ? parseFloat(formatEther((price as bigint * totalSupply as bigint) / BigInt(1e18))) 
    : 0;

  return (
    <Link to={`/token/${address}`} className="group card-bg border border-white/10 rounded-[2rem] p-6 hover:border-green-500/50 transition-all hover:scale-[1.03] cursor-pointer block relative overflow-hidden shadow-2xl">
      <div className="flex items-center gap-5 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center text-green-500 font-black text-3xl border border-white/5 shadow-inner">
          {symbol.toString().slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-xl truncate group-hover:text-green-400 transition-colors">{name.toString()}</h3>
          <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">{symbol.toString()}</p>
        </div>
      </div>
      
      <div className="space-y-5">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-black font-mono mb-1">Market Cap</p>
            <p className="text-lg font-black text-gray-100">{mcap.toFixed(4)} <span className="text-[10px] text-gray-500">ETH</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase font-black font-mono mb-1">Progress</p>
            <p className="text-lg font-black text-green-500">{progress?.toString()}%</p>
          </div>
        </div>

        <div className="w-full bg-black rounded-full h-2.5 overflow-hidden border border-white/5 p-0.5">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${isGraduated ? 'bg-yellow-500' : 'pump-gradient'}`}
            style={{ width: `${progress?.toString() || 0}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between">
            <p className="text-[9px] text-gray-600 font-mono truncate max-w-[120px]">{address}</p>
            {isGraduated && <span className="text-[9px] font-black text-yellow-500 uppercase">Graduated</span>}
        </div>
      </div>
    </Link>
  );
};

export default function Dashboard() {
  const [tokens, setTokens] = useState<`0x${string}`[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lpEthAmount, setLpEthAmount] = useState<string>('0.1');
  
  const publicClient = usePublicClient({ chainId: baseSepolia.id });
  const { address: userAddress, isConnected } = useAccount();

  // 1. 改为通过 Logs (事件) 获取代币列表
  const fetchTokens = useCallback(async (showLoading = false) => {
    if (!publicClient) return;
    if (showLoading) setIsLoadingList(true);
    setIsRefreshing(true);
    
    try {
      // 这里的 event ABI 必须与 constants.ts 中的 CORE_ABI 里的 OrgLaunched 匹配
      const logs = await publicClient.getLogs({
        address: CORE_ADDRESS as `0x${string}`,
        event: parseAbiItem('event OrgLaunched(address indexed token, address indexed creator)'),
        fromBlock: 0n, // 从区块0开始扫描
        toBlock: 'latest'
      });
      
      // 提取代币地址，去重，并反转（最新的排在前面）
      const addresses = logs
        .map(log => log.args.token as `0x${string}`)
        .filter((addr, index, self) => addr && self.indexOf(addr) === index)
        .reverse();

      setTokens(addresses);
    } catch (err) {
      console.error("Dashboard: 事件日志抓取失败:", err);
      // 如果日志抓取受限，回退到原始方式（或者提示）
    } finally {
      setIsLoadingList(false);
      setIsRefreshing(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchTokens(true);
    const timer = setInterval(() => fetchTokens(false), 20000);
    return () => clearInterval(timer);
  }, [fetchTokens]);

  useWatchContractEvent({
    address: CORE_ADDRESS as `0x${string}`,
    abi: CORE_ABI,
    eventName: 'OrgLaunched',
    chainId: baseSepolia.id,
    onLogs() {
      // 监听到新事件后稍微延迟一下刷新，给节点同步时间
      setTimeout(() => fetchTokens(false), 2000);
    },
  });

  const { data: coreName } = useReadContract({ 
    address: CORE_ADDRESS as `0x${string}`, 
    abi: CORE_ABI, 
    functionName: 'name', 
    chainId: baseSepolia.id 
  });
  
  const { data: userCoreBalance } = useReadContract({ 
    address: CORE_ADDRESS as `0x${string}`, 
    abi: CORE_ABI, 
    functionName: 'balanceOf', 
    args: [userAddress || '0x0000000000000000000000000000000000000000'],
    chainId: baseSepolia.id
  });

  const { data: lpIsAdded, refetch: refetchLpStatus } = useReadContract({
    address: CORE_ADDRESS as `0x${string}`,
    abi: CORE_ABI,
    functionName: 'initialLiquidityAdded',
    chainId: baseSepolia.id
  });

  const { writeContract, data: txHash, isPending: isTxPending } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleAddLp = () => {
    if (!lpEthAmount || isNaN(parseFloat(lpEthAmount))) return;
    writeContract({
      address: CORE_ADDRESS as `0x${string}`,
      abi: CORE_ABI as any,
      functionName: 'addInitialLiquidityAndBurnLP',
      value: parseEther(lpEthAmount)
    });
  };

  useEffect(() => {
    if (isTxSuccess) refetchLpStatus();
  }, [isTxSuccess, refetchLpStatus]);

  return (
    <div className="space-y-12">
      <section className="relative py-20 px-10 rounded-[3rem] overflow-hidden bg-[#111] border border-white/5">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-green-500/10 to-transparent"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
          <div className="max-w-2xl">
            <div className="inline-block bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-6">
              Official Base Sepolia Launchpad
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">
              START <span className="text-green-500">FAIR</span><br />
              PUMP <span className="text-blue-500">HARD</span>
            </h1>
            <p className="text-xl text-gray-400 font-medium font-mono leading-relaxed">
              Base Sepolia 上的首个联合曲线发射平台。
              <br />
              核心合约: <span className="text-gray-600 text-xs break-all selection:bg-green-500/30">{CORE_ADDRESS}</span>
            </p>
          </div>
          <Link 
            to="/create" 
            className="group relative inline-flex items-center justify-center px-16 py-8 font-black text-black transition-all duration-300 bg-green-500 rounded-3xl hover:bg-green-400 hover:scale-105 shadow-[0_20px_60px_-15px_rgba(34,197,94,0.5)] active:scale-95"
          >
            发布新代币
          </Link>
        </div>
      </section>

      {/* Protocol Liquidity Hub */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card-bg border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${lpIsAdded ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>
              <span className={`w-2 h-2 rounded-full ${lpIsAdded ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-bounce'}`}></span>
              {lpIsAdded ? 'Protocol LP Active' : 'Protocol LP Pending'}
            </div>
          </div>
          
          <div className="max-w-md">
            <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">流动性管理器 (LP Hub)</h2>
            <p className="text-gray-400 text-sm font-mono mb-8 leading-relaxed">
              在此处为 $PRM 协议代币添加初始流动性。系统将自动在 Uniswap 创建交易对并永久销毁 LP 代币以确保安全性。
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <input 
                  type="number" 
                  step="0.01"
                  value={lpEthAmount}
                  onChange={(e) => setLpEthAmount(e.target.value)}
                  disabled={!!lpIsAdded}
                  placeholder="ETH Amount"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xl font-black focus:outline-none focus:border-green-500/50 disabled:opacity-30"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 font-black text-sm">ETH</span>
              </div>
              <button 
                onClick={handleAddLp}
                disabled={!isConnected || lpIsAdded || isTxPending || isTxConfirming || !lpEthAmount}
                className={`px-8 py-4 rounded-2xl font-black uppercase transition-all flex items-center justify-center gap-2 ${lpIsAdded ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl active:scale-95'}`}
              >
                {isTxPending || isTxConfirming ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : lpIsAdded ? '已添加流动性' : '添加流动性并销毁 LP'}
              </button>
            </div>
          </div>
        </div>

        <div className="card-bg border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between">
           <div>
             <p className="text-[10px] text-gray-500 uppercase font-black mb-2 font-mono tracking-widest">Protocol Token</p>
             <p className="text-4xl font-black text-green-500">{coreName?.toString() || 'Loading...'}</p>
             <div className="mt-4 h-px bg-white/5"></div>
           </div>
           
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 uppercase font-black font-mono">Your $PRM Balance</span>
                <span className="text-xl font-black text-blue-500">
                  {isConnected ? (userCoreBalance ? `${parseFloat(formatEther(userCoreBalance as bigint)).toLocaleString()}` : '0') : '--'}
                </span>
              </div>
              <button 
                onClick={() => writeContract({ address: CORE_ADDRESS as `0x${string}`, abi: CORE_ABI as any, functionName: 'claimGovernanceTokens' })}
                disabled={!isConnected}
                className="w-full bg-white/5 border border-white/10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
              >
                领取代币 (Faucet)
              </button>
           </div>
        </div>
      </section>

      <div className="space-y-10">
        <div className="flex items-center justify-between border-b border-white/10 pb-8">
          <h2 className="text-4xl font-black font-mono tracking-tighter uppercase flex items-center gap-5">
            Token Terminal
            {(isLoadingList || isRefreshing) && <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>}
          </h2>
          <div className="flex items-center gap-4">
             <button 
               onClick={() => fetchTokens(true)} 
               className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors border border-white/10 px-4 py-2 rounded-xl bg-white/5"
             >
               手动同步数据
             </button>
             <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 text-xs font-mono text-gray-500">
               DISCOVERED: {tokens.length}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {isLoadingList && tokens.length === 0 ? (
            Array(8).fill(0).map((_, i) => <div key={i} className="card-bg border border-white/5 rounded-3xl h-64 animate-pulse"></div>)
          ) : tokens.length === 0 ? (
            <div className="col-span-full py-32 text-center card-bg border-2 border-dashed border-white/5 rounded-[3rem]">
              <div className="text-6xl mb-6 grayscale">📡</div>
              <h3 className="text-2xl font-black text-gray-400 mb-3 uppercase tracking-tighter">No Tokens Found</h3>
              <p className="text-gray-600 font-mono text-sm max-w-sm mx-auto leading-relaxed">
                未在 Base Sepolia 上检测到代币。请确保已连接钱包，且合约 {CORE_ADDRESS} 确实已在此网络部署。
              </p>
            </div>
          ) : (
            tokens.map((addr) => (
              <TokenCard key={addr} address={addr} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
