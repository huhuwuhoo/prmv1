
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useReadContract, usePublicClient, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { CORE_ADDRESS, CORE_ABI, SUBTOKEN_ABI } from '../constants';
import { formatEther } from 'viem';
import { baseSepolia } from 'wagmi/chains';

interface TokenCardProps {
  address: `0x${string}`;
}

const TokenCard: React.FC<TokenCardProps> = ({ address }) => {
  // 必须显式添加 chainId: baseSepolia.id 确保读取正确
  const { data: name } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'name', chainId: baseSepolia.id });
  const { data: symbol } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'symbol', chainId: baseSepolia.id });
  const { data: progress } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'getProgress', chainId: baseSepolia.id });
  const { data: price } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'getCurrentPrice', chainId: baseSepolia.id });
  const { data: isGraduated } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'isGraduated', chainId: baseSepolia.id });
  const { data: totalSupply } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'totalSupply', chainId: baseSepolia.id });

  if (!name || !symbol) return (
    <div className="card-bg pump-border rounded-xl p-4 h-52 animate-pulse flex flex-col justify-between">
      <div className="h-14 w-14 bg-white/5 rounded-lg"></div>
      <div className="space-y-2">
        <div className="h-4 bg-white/5 rounded w-3/4"></div>
        <div className="h-3 bg-white/5 rounded w-1/2"></div>
      </div>
      <div className="h-2 bg-white/5 rounded w-full"></div>
    </div>
  );

  const mcap = price && totalSupply 
    ? parseFloat(formatEther((price as bigint * totalSupply as bigint) / BigInt(1e18))) 
    : 0;

  return (
    <Link to={`/token/${address}`} className="group card-bg pump-border rounded-2xl p-5 hover:border-green-500/50 transition-all hover:scale-[1.02] cursor-pointer block relative overflow-hidden">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/10 to-blue-500/10 flex items-center justify-center text-green-500 font-bold text-2xl border border-white/5">
          {symbol.toString().slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg truncate group-hover:text-green-400 transition-colors">{name.toString()}</h3>
          <p className="text-xs text-gray-500 font-mono uppercase truncate">{symbol.toString()}</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-mono">市值 (ETH)</p>
            <p className="text-sm font-bold text-gray-200">{mcap.toFixed(6)} ETH</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase font-mono">进度</p>
            <p className="text-sm font-bold text-green-400">{progress?.toString()}%</p>
          </div>
        </div>

        <div className="w-full bg-black rounded-full h-2 overflow-hidden border border-white/5">
          <div 
            className={`h-full transition-all duration-700 ${isGraduated ? 'bg-yellow-500' : 'pump-gradient'}`}
            style={{ width: `${progress?.toString() || 0}%` }}
          />
        </div>
        
        <p className="text-[9px] text-gray-600 font-mono truncate">{address}</p>
      </div>
    </Link>
  );
};

export default function Dashboard() {
  const [tokens, setTokens] = useState<`0x${string}`[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const publicClient = usePublicClient({ chainId: baseSepolia.id });
  const { address: userAddress, isConnected } = useAccount();

  // 核心合约数据，强制 Base Sepolia
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
    chainId: baseSepolia.id,
    query: {
      enabled: !!userAddress,
      refetchInterval: 5000
    }
  });

  const { writeContract, data: govHash, isPending: isGovPending } = useWriteContract();
  const { isLoading: isGovConfirming, isSuccess: isGovSuccess } = useWaitForTransactionReceipt({ hash: govHash });

  useEffect(() => {
    const fetchTokens = async () => {
      if (!publicClient) return;
      setIsLoadingList(true);
      const loaded: `0x${string}`[] = [];
      try {
        // 尝试加载最新的 20 个代币
        for (let i = 0; i < 20; i++) {
          try {
            const addr = await publicClient.readContract({
              address: CORE_ADDRESS as `0x${string}`,
              abi: CORE_ABI as any,
              functionName: 'allSubTokens',
              args: [BigInt(i)]
            });
            if (addr && addr !== '0x0000000000000000000000000000000000000000') {
              loaded.push(addr as `0x${string}`);
            } else {
              break;
            }
          } catch (e) {
            break;
          }
        }
        setTokens(loaded.reverse());
      } catch (err) {
        console.error("Dashboard: Error fetching tokens:", err);
      } finally {
        setIsLoadingList(false);
      }
    };
    fetchTokens();
  }, [publicClient]);

  return (
    <div className="space-y-10">
      <section className="relative py-16 px-8 rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-green-500/10 via-[#0d0d0d] to-blue-500/5 border border-white/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="max-w-xl">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-none">
              PUMP <span className="text-green-500">FAIR</span>
            </h1>
            <p className="text-lg text-gray-400 font-medium font-mono">
              在 Base Sepolia 上安全地发射您的代币。
              <br />
              合约地址: <span className="text-gray-500 text-xs break-all">{CORE_ADDRESS}</span>
            </p>
          </div>
          <Link 
            to="/create" 
            className="group relative inline-flex items-center justify-center px-12 py-6 font-black text-black transition-all duration-300 bg-green-500 rounded-2xl hover:bg-green-400 hover:scale-105 shadow-[0_0_50px_rgba(34,197,94,0.3)]"
          >
            发布我的代币
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-bg pump-border rounded-2xl p-6">
          <p className="text-[10px] text-gray-500 uppercase font-black mb-1 font-mono tracking-widest">核心合约</p>
          <p className="text-xl font-bold text-green-500">{coreName?.toString() || '连接中...'}</p>
        </div>
        <div className="card-bg pump-border rounded-2xl p-6">
          <p className="text-[10px] text-gray-500 uppercase font-black mb-1 font-mono tracking-widest">我的测试币余额</p>
          <p className="text-xl font-bold text-blue-400 truncate">
            {isConnected ? (userCoreBalance ? `${parseFloat(formatEther(userCoreBalance as bigint)).toLocaleString()} PRM` : '0.00') : '未连接'}
          </p>
        </div>
        <button 
          onClick={() => writeContract({ address: CORE_ADDRESS as `0x${string}`, abi: CORE_ABI as any, functionName: 'claimGovernanceTokens' })}
          disabled={!isConnected || isGovPending || isGovConfirming}
          className="card-bg pump-border rounded-2xl p-6 hover:bg-white/5 transition-colors group flex flex-col justify-center"
        >
          <p className="text-[10px] text-gray-500 uppercase font-black mb-1 font-mono tracking-widest">水龙头 / 操作</p>
          <p className="text-xl font-bold text-yellow-500 group-hover:text-yellow-400">
            {isGovPending || isGovConfirming ? '交易中...' : '领取治理代币'}
          </p>
        </button>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <h2 className="text-3xl font-black font-mono tracking-tighter uppercase flex items-center gap-4">
            测试网代币列表
            {isLoadingList && <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>}
          </h2>
          <span className="text-xs font-mono text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
            发现: {tokens.length}
          </span>
        </div>

        {isGovSuccess && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-xl text-center text-sm font-bold font-mono animate-bounce">
            交易发送成功！
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoadingList && tokens.length === 0 ? (
            Array(4).fill(0).map((_, i) => <div key={i} className="card-bg pump-border rounded-2xl h-56 animate-pulse"></div>)
          ) : tokens.length === 0 ? (
            <div className="col-span-full py-24 text-center">
              <p className="text-4xl mb-4">🛸</p>
              <h3 className="text-xl font-bold text-gray-400 mb-2">未找到任何代币</h3>
              <p className="text-sm text-gray-600 font-mono">请确保合约已在 Base Sepolia (Chain ID: 84532) 上部署。</p>
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
