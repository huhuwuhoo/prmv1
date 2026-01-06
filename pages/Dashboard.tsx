
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
  // 显式指定 chainId 确保数据来自 Base Sepolia
  const { data: name } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'name', chainId: baseSepolia.id });
  const { data: symbol } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'symbol', chainId: baseSepolia.id });
  const { data: progress } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'getProgress', chainId: baseSepolia.id });
  const { data: price } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'getCurrentPrice', chainId: baseSepolia.id });
  const { data: isGraduated } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'isGraduated', chainId: baseSepolia.id });
  const { data: totalSupply } = useReadContract({ address, abi: SUBTOKEN_ABI, functionName: 'totalSupply', chainId: baseSepolia.id });

  if (!name || !symbol) return (
    <div className="card-bg pump-border rounded-xl p-4 h-48 animate-pulse flex flex-col justify-between">
      <div className="flex gap-4">
        <div className="w-14 h-14 bg-white/5 rounded-lg"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/5 rounded w-3/4"></div>
          <div className="h-3 bg-white/5 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2 bg-white/5 rounded w-full"></div>
        <div className="h-2 bg-white/5 rounded w-full"></div>
      </div>
    </div>
  );

  const mcap = price && totalSupply 
    ? parseFloat(formatEther((price as bigint * totalSupply as bigint) / BigInt(1e18))) 
    : 0;

  return (
    <Link to={`/token/${address}`} className="group card-bg pump-border rounded-xl p-4 hover:border-green-500/50 transition-all hover:scale-[1.01] cursor-pointer block relative overflow-hidden">
      {isGraduated && (
        <div className="absolute top-0 right-0 bg-yellow-500 text-black px-2 py-0.5 text-[10px] font-bold uppercase z-10">
          已上线 Uniswap (Base)
        </div>
      )}
      
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center text-green-500 font-bold text-2xl border border-white/5">
          {symbol.toString().slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg group-hover:text-green-400 transition-colors truncate">{name.toString()}</h3>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 font-mono uppercase truncate">{symbol.toString()}</p>
            <span className="text-[10px] text-gray-600 bg-white/5 px-1 rounded">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-mono">市值 (ETH)</p>
            <p className="text-sm font-bold text-gray-200">{mcap.toFixed(4)} ETH</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase font-mono">进度</p>
            <p className="text-sm font-bold text-green-400">{progress?.toString()}%</p>
          </div>
        </div>

        <div className="w-full bg-black rounded-full h-1.5 overflow-hidden border border-white/5">
          <div 
            className={`h-full transition-all duration-500 ${isGraduated ? 'bg-yellow-500' : 'pump-gradient'}`}
            style={{ width: `${progress?.toString() || 0}%` }}
          />
        </div>
      </div>
    </Link>
  );
};

export default function Dashboard() {
  const [tokens, setTokens] = useState<`0x${string}`[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const publicClient = usePublicClient();
  const { address: userAddress, isConnected } = useAccount();

  // 核心合约数据读取，显式指定 chainId
  const { data: coreName } = useReadContract({ 
    address: CORE_ADDRESS as `0x${string}`, 
    abi: CORE_ABI, 
    functionName: 'name', 
    chainId: baseSepolia.id 
  });
  const { data: coreTotalSupply } = useReadContract({ 
    address: CORE_ADDRESS as `0x${string}`, 
    abi: CORE_ABI, 
    functionName: 'totalSupply', 
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

  const handleClaimGov = () => {
    writeContract({
      address: CORE_ADDRESS as `0x${string}`,
      abi: CORE_ABI as any,
      functionName: 'claimGovernanceTokens',
    });
  };

  useEffect(() => {
    const fetchTokens = async () => {
      if (!publicClient) return;
      setIsLoadingList(true);
      const loaded: `0x${string}`[] = [];
      try {
        // 尝试加载前 30 个代币
        for (let i = 0; i < 30; i++) {
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
            // 达到数组末尾
            break;
          }
        }
        setTokens(loaded.reverse());
      } catch (err) {
        console.error("Error fetching tokens:", err);
      } finally {
        setIsLoadingList(false);
      }
    };
    fetchTokens();
  }, [publicClient]);

  return (
    <div className="space-y-10">
      <section className="relative py-12 px-6 rounded-3xl overflow-hidden bg-gradient-to-br from-blue-500/10 via-black to-green-500/5 pump-border">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <div className="w-64 h-64 border-4 border-blue-500 rounded-full animate-pulse"></div>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
               <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter">
                FAIR<span className="text-green-500">PRAEM</span>
              </h1>
              <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase mt-4">Base Sepolia</span>
            </div>
            <p className="text-xl text-gray-400 font-medium">
              Base Sepolia 上的去中心化代币发射站。
              <br className="hidden md:block" />
              公平启动，联合曲线，永久流动性销毁。
            </p>
          </div>
          <Link 
            to="/create" 
            className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-black transition-all duration-200 bg-green-500 font-pj rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 hover:scale-[1.05] shadow-[0_0_40px_rgba(34,197,94,0.4)]"
          >
            [ 我要发币 ]
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-bg pump-border rounded-2xl p-4">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 font-mono">核心代币</p>
          <p className="text-lg font-bold text-green-500 truncate">{coreName?.toString() || '读取中...'}</p>
        </div>
        <div className="card-bg pump-border rounded-2xl p-4">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 font-mono">总发行量</p>
          <p className="text-lg font-bold truncate">{coreTotalSupply ? parseFloat(formatEther(coreTotalSupply as bigint)).toLocaleString() : '0'}</p>
        </div>
        <div className="card-bg pump-border rounded-2xl p-4">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 font-mono">我的余额</p>
          <p className={`text-lg font-bold truncate ${isConnected ? 'text-blue-400' : 'text-gray-600'}`}>
            {isConnected ? (userCoreBalance ? parseFloat(formatEther(userCoreBalance as bigint)).toLocaleString() : '...') : '未连接'}
          </p>
        </div>
        <button 
          onClick={handleClaimGov}
          disabled={!isConnected || isGovPending || isGovConfirming}
          className="card-bg pump-border rounded-2xl p-4 hover:bg-white/5 transition-colors disabled:opacity-50 group"
        >
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 font-mono">核心代币操作</p>
          <p className="text-lg font-bold text-yellow-500 group-hover:text-yellow-400">
            {isGovPending || isGovConfirming ? '处理中...' : '领取治理奖励'}
          </p>
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-2xl font-bold font-mono tracking-widest uppercase flex items-center gap-3">
            Base Sepolia 最新发射
            {isLoadingList && <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>}
          </h2>
          <div className="flex gap-2 text-xs font-mono">
            <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded">LIVE</span>
            <span className="text-gray-500 px-2 py-1 bg-white/5 rounded">已发现: {tokens.length}</span>
          </div>
        </div>

        {isGovSuccess && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-xl text-center text-sm font-mono animate-bounce">
            SUCCESS: 治理代币已领取!
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoadingList && tokens.length === 0 ? (
            Array(4).fill(0).map((_, i) => <div key={i} className="card-bg pump-border rounded-xl p-4 h-48 animate-pulse bg-white/5"></div>)
          ) : tokens.length === 0 ? (
            <div className="col-span-full py-32 text-center text-gray-500 border-2 border-dashed border-white/5 rounded-3xl">
              <div className="mb-4 text-4xl">🛸</div>
              <p className="text-xl font-bold mb-2">未发现任何代币</p>
              <p className="text-sm font-mono opacity-60 max-w-xs mx-auto">
                请确保你的合约已部署在 <span className="text-blue-400">Base Sepolia</span> (0x84532) 且地址 {CORE_ADDRESS} 正确。
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
